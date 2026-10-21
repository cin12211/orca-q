import knex, { type Knex } from 'knex';
import { existsSync } from 'node:fs';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import {
  APP_CONFIG_PERSIST_ID,
  McpConnectionAccess,
  normalizeMcpServerConfigs,
  type McpServerConfigs,
} from '~/core/persist/normalize';
import type { Connection } from '~/core/types/entities/connection.entity';

/**
 * Path to the Electron persistence database (orcaq.db). Electron main sets it
 * when spawning the Nitro sidecar; the web/npx runtime never has it, so the
 * MCP endpoint stays disabled there.
 */
export const DESKTOP_PERSIST_DB_PATH_ENV = 'ORCAQ_PERSIST_DB_PATH';

export interface McpConnectionEntry {
  connection: Connection;
  access: McpConnectionAccess;
}

let persistDb: Knex | null = null;

export function getDesktopPersistDbPath(): string | null {
  const dbPath = process.env[DESKTOP_PERSIST_DB_PATH_ENV];
  return dbPath && existsSync(dbPath) ? dbPath : null;
}

function getPersistDb(): Knex {
  const dbPath = getDesktopPersistDbPath();

  if (!dbPath) {
    throw new Error('OrcaQ desktop data store is not available.');
  }

  persistDb ??= knex({
    client: DatabaseClientType.SQLITE3,
    connection: { filename: dbPath },
    useNullAsDefault: true,
    pool: { min: 0, max: 1 },
  });

  return persistDb;
}

function parseJson<T>(value: unknown): T | undefined {
  if (typeof value !== 'string' || !value) return undefined;

  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

function toOptionalString(value: unknown): string | undefined {
  return value === null || value === undefined ? undefined : String(value);
}

function fromConnectionRow(row: Record<string, unknown>): Connection {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id ?? ''),
    name: String(row.name ?? ''),
    type: row.type as Connection['type'],
    method: row.method as Connection['method'],
    providerKind: toOptionalString(
      row.provider_kind
    ) as Connection['providerKind'],
    connectionString: toOptionalString(row.connection_string),
    host: toOptionalString(row.host),
    port: toOptionalString(row.port),
    username: toOptionalString(row.username),
    password: toOptionalString(row.password),
    database: toOptionalString(row.database),
    serviceName: toOptionalString(row.service_name),
    filePath: toOptionalString(row.file_path),
    managedSqlite: parseJson(row.managed_sqlite),
    ssl: parseJson(row.ssl),
    ssh: parseJson(row.ssh),
    tagIds: parseJson(row.tag_ids),
    createdAt: String(row.created_at ?? ''),
    updatedAt: toOptionalString(row.updated_at),
  };
}

/** Read the MCP settings fresh on every call so Settings changes apply instantly. */
export async function getMcpServerConfigs(): Promise<McpServerConfigs> {
  if (!getDesktopPersistDbPath()) {
    return normalizeMcpServerConfigs(undefined);
  }

  const row = await getPersistDb()('app_config')
    .where({ id: APP_CONFIG_PERSIST_ID })
    .first();
  const appConfig = parseJson<Record<string, unknown>>(row?.data);

  return normalizeMcpServerConfigs(appConfig?.mcpServerConfigs);
}

export function resolveConnectionAccess(
  configs: McpServerConfigs,
  connectionId: string
): McpConnectionAccess {
  return configs.connectionAccess[connectionId] ?? McpConnectionAccess.Read;
}

/** Connections exposed to MCP clients (access mode other than `off`). */
export async function listMcpConnections(): Promise<McpConnectionEntry[]> {
  const configs = await getMcpServerConfigs();
  const rows = (await getPersistDb()('connections').orderBy(
    'created_at',
    'asc'
  )) as Record<string, unknown>[];

  return rows
    .map(row => {
      const connection = fromConnectionRow(row);
      return {
        connection,
        access: resolveConnectionAccess(configs, connection.id),
      };
    })
    .filter(entry => entry.access !== McpConnectionAccess.Off);
}

export async function getMcpConnection(
  connectionId: string
): Promise<McpConnectionEntry> {
  const entry = (await listMcpConnections()).find(
    item => item.connection.id === connectionId
  );

  if (!entry) {
    throw new Error(
      `Connection "${connectionId}" was not found or is not shared with MCP. Call list_connections to see available connections.`
    );
  }

  return entry;
}

export async function getWorkspaceNames(): Promise<Map<string, string>> {
  const rows = (await getPersistDb()('workspaces').select('id', 'name')) as {
    id: string;
    name: string;
  }[];

  return new Map(rows.map(row => [row.id, row.name]));
}
