import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { getConnectionParams } from '~/core/helpers/connection-helper';
import { McpConnectionAccess } from '~/core/persist/normalize';
import type { Connection } from '~/core/types/entities/connection.entity';
import {
  createMetadataAdapter,
  createTableAdapter,
} from '~/server/infrastructure/database/adapters';
import { getDatabaseSource } from '~/server/infrastructure/driver';
import {
  getMcpConnection,
  getWorkspaceNames,
  listMcpConnections,
} from './desktop-store';
import {
  clampRowLimit,
  executeReadOnlyQuery,
  executeWriteQuery,
  MCP_MAX_ROW_LIMIT,
} from './query-executor';
import { assertReadOnlySql } from './read-only-sql';

const MCP_SUPPORTED_CLIENT_TYPES: DatabaseClientType[] = [
  DatabaseClientType.POSTGRES,
  DatabaseClientType.MYSQL,
  DatabaseClientType.MARIADB,
  DatabaseClientType.SQLITE3,
  DatabaseClientType.ORACLE,
];

function isSupportedConnectionType(type: DatabaseClientType) {
  return MCP_SUPPORTED_CLIENT_TYPES.includes(type);
}

const SERVER_INFO = { name: 'orcaq', version: '1.0.0' };

const SERVER_INSTRUCTIONS =
  'OrcaQ exposes the database connections saved in the OrcaQ desktop app. ' +
  'Start with list_connections, then explore with list_schemas, list_tables and describe_table before writing SQL. ' +
  'run_query is read-only unless the connection was granted write access in OrcaQ Settings → MCP Server.';

const connectionIdSchema = z
  .string()
  .describe('Connection id from list_connections.');

function jsonResult(value: unknown): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
  };
}

function errorResult(error: unknown): CallToolResult {
  const message = error instanceof Error ? error.message : String(error);
  return { content: [{ type: 'text', text: message }], isError: true };
}

async function withToolErrors(
  run: () => Promise<CallToolResult>
): Promise<CallToolResult> {
  try {
    return await run();
  } catch (error) {
    return errorResult(error);
  }
}

async function getSqlConnection(connectionId: string) {
  const entry = await getMcpConnection(connectionId);

  if (!isSupportedConnectionType(entry.connection.type)) {
    throw new Error(
      `Connection "${entry.connection.name}" is ${entry.connection.type}; OrcaQ MCP currently supports PostgreSQL, MySQL, MariaDB, SQLite and Oracle.`
    );
  }

  return entry;
}

function toAdapterParams(connection: Connection) {
  return getConnectionParams(connection);
}

export function createOrcaqMcpServer(): McpServer {
  const server = new McpServer(SERVER_INFO, {
    instructions: SERVER_INSTRUCTIONS,
  });

  server.registerTool(
    'list_connections',
    {
      title: 'List connections',
      description:
        'List database connections shared with MCP from the OrcaQ desktop app. Credentials are never returned.',
      annotations: { readOnlyHint: true },
    },
    () =>
      withToolErrors(async () => {
        const [entries, workspaceNames] = await Promise.all([
          listMcpConnections(),
          getWorkspaceNames(),
        ]);

        return jsonResult(
          entries.map(({ connection, access }) => ({
            id: connection.id,
            name: connection.name,
            type: connection.type,
            workspace: workspaceNames.get(connection.workspaceId) ?? null,
            access,
            supported: isSupportedConnectionType(connection.type),
          }))
        );
      })
  );

  server.registerTool(
    'list_schemas',
    {
      title: 'List schemas',
      description: 'List schema names of a connection.',
      inputSchema: { connectionId: connectionIdSchema },
      annotations: { readOnlyHint: true },
    },
    ({ connectionId }) =>
      withToolErrors(async () => {
        const { connection } = await getSqlConnection(connectionId);
        const adapter = await createMetadataAdapter(
          connection.type,
          toAdapterParams(connection)
        );
        const schemas = await adapter.getSchemaMetaData({ namesOnly: true });

        return jsonResult(
          schemas.map(schema => ({
            name: schema.name,
            isSystem: schema.is_system ?? false,
          }))
        );
      })
  );

  server.registerTool(
    'list_tables',
    {
      title: 'List tables',
      description: 'List tables and views in a schema.',
      inputSchema: {
        connectionId: connectionIdSchema,
        schema: z.string().describe('Schema name from list_schemas.'),
      },
      annotations: { readOnlyHint: true },
    },
    ({ connectionId, schema }) =>
      withToolErrors(async () => {
        const { connection } = await getSqlConnection(connectionId);
        const adapter = await createMetadataAdapter(
          connection.type,
          toAdapterParams(connection)
        );
        const [metadata] = await adapter.getSchemaMetaData({
          schemaName: schema,
        });

        return jsonResult({
          schema,
          tables: metadata?.tables ?? [],
          views: (metadata?.views ?? []).map(view => view.name),
        });
      })
  );

  server.registerTool(
    'describe_table',
    {
      title: 'Describe table',
      description:
        'Columns (type, nullability, default, foreign keys, comment) and indexes of a table.',
      inputSchema: {
        connectionId: connectionIdSchema,
        schema: z.string().describe('Schema name.'),
        table: z.string().describe('Table name.'),
      },
      annotations: { readOnlyHint: true },
    },
    ({ connectionId, schema, table }) =>
      withToolErrors(async () => {
        const { connection } = await getSqlConnection(connectionId);
        const adapter = await createTableAdapter(
          connection.type,
          toAdapterParams(connection)
        );
        const [columns, indexes] = await Promise.all([
          adapter.getTableStructure(schema, table),
          adapter.getTableIndexes(schema, table).catch(() => []),
        ]);

        return jsonResult({ schema, table, columns, indexes });
      })
  );

  server.registerTool(
    'run_query',
    {
      title: 'Run SQL',
      description:
        `Run one SQL statement and return rows as JSON (default 100 rows, max ${MCP_MAX_ROW_LIMIT}). ` +
        'Read-only connections only accept SELECT/WITH/SHOW/DESCRIBE/EXPLAIN/PRAGMA and run inside a read-only transaction. ' +
        'Connections with write access run any statement and changes are committed.',
      inputSchema: {
        connectionId: connectionIdSchema,
        sql: z.string().describe('A single SQL statement.'),
        limit: z
          .number()
          .int()
          .positive()
          .optional()
          .describe(`Max rows to return (1-${MCP_MAX_ROW_LIMIT}).`),
      },
      annotations: { destructiveHint: true },
    },
    ({ connectionId, sql, limit }) =>
      withToolErrors(async () => {
        const { connection, access } = await getSqlConnection(connectionId);
        const adapter = await getDatabaseSource(toAdapterParams(connection));
        const rowLimit = clampRowLimit(limit);

        const result =
          access === McpConnectionAccess.Write
            ? await executeWriteQuery(adapter, sql, rowLimit)
            : await executeReadOnlyQuery(
                adapter,
                assertReadOnlySql(sql),
                rowLimit
              );

        return jsonResult({ access, ...result });
      })
  );

  server.registerTool(
    'explain_query',
    {
      title: 'Explain SQL',
      description:
        'Show the execution plan of a read-only query without running it (EXPLAIN, not ANALYZE).',
      inputSchema: {
        connectionId: connectionIdSchema,
        sql: z.string().describe('A single SELECT/WITH statement.'),
      },
      annotations: { readOnlyHint: true },
    },
    ({ connectionId, sql }) =>
      withToolErrors(async () => {
        const { connection } = await getSqlConnection(connectionId);
        const adapter = await getDatabaseSource(toAdapterParams(connection));
        const explainSql = buildExplainSql(connection, assertReadOnlySql(sql));
        const result = await executeReadOnlyQuery(
          adapter,
          explainSql,
          MCP_MAX_ROW_LIMIT
        );

        return jsonResult(result);
      })
  );

  return server;
}

function buildExplainSql(connection: Connection, sql: string) {
  if (connection.type === DatabaseClientType.SQLITE3)
    return `EXPLAIN QUERY PLAN ${sql}`;
  if (connection.type === DatabaseClientType.ORACLE) {
    throw new Error(
      'explain_query is not available for Oracle yet; use run_query with your own plan query.'
    );
  }
  return `EXPLAIN ${sql}`;
}
