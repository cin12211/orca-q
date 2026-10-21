import QueryStream from 'pg-query-stream';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { IDatabaseAdapter } from '~/server/infrastructure/driver';

export const MCP_DEFAULT_ROW_LIMIT = 100;
export const MCP_MAX_ROW_LIMIT = 500;
export const MCP_QUERY_TIMEOUT_MS = 30_000;
const MAX_CELL_TEXT_LENGTH = 2_000;

export interface McpQueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
  durationMs: number;
}

interface FetchedRows {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount?: number;
}

type RawConnection = any;

export function clampRowLimit(limit?: number) {
  if (!limit || !Number.isFinite(limit)) return MCP_DEFAULT_ROW_LIMIT;
  return Math.max(1, Math.min(Math.floor(limit), MCP_MAX_ROW_LIMIT));
}

function toJsonSafe(value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return `<binary ${value.length} bytes>`;
  if (typeof value === 'string' && value.length > MAX_CELL_TEXT_LENGTH) {
    return `${value.slice(0, MAX_CELL_TEXT_LENGTH)}… (${value.length} chars)`;
  }
  return value;
}

function finalize(
  fetched: FetchedRows,
  limit: number,
  startedAt: number
): McpQueryResult {
  const truncated = fetched.rows.length > limit;
  const rows = fetched.rows
    .slice(0, limit)
    .map(row =>
      Object.fromEntries(
        Object.entries(row).map(([key, value]) => [key, toJsonSafe(value)])
      )
    );

  return {
    columns: fetched.columns,
    rows,
    rowCount: fetched.rowCount ?? rows.length,
    truncated,
    durationMs: Math.round(performance.now() - startedAt),
  };
}

// ── Read-only execution: every engine runs inside a database-enforced
// read-only scope and is always rolled back. ────────────────────────────────

async function readPostgres(
  client: RawConnection,
  sql: string,
  fetchCount: number
): Promise<FetchedRows> {
  await client.query('BEGIN READ ONLY');

  try {
    await client.query(`SET LOCAL statement_timeout = ${MCP_QUERY_TIMEOUT_MS}`);
    const stream = client.query(
      new QueryStream(sql, [], { batchSize: fetchCount })
    );
    const rows: Record<string, unknown>[] = [];

    for await (const row of stream) {
      rows.push(row as Record<string, unknown>);
      if (rows.length >= fetchCount) break;
    }

    const fields = (stream.cursor?._result?.fields ?? []) as { name: string }[];
    const columns = fields.length
      ? fields.map(field => field.name)
      : Object.keys(rows[0] ?? {});

    return { columns, rows };
  } finally {
    await client.query('ROLLBACK');
  }
}

function mysqlQuery(
  connection: RawConnection,
  sql: string
): Promise<{ rows: unknown; fields?: { name: string }[] }> {
  return new Promise((resolve, reject) => {
    connection.query(
      { sql, timeout: MCP_QUERY_TIMEOUT_MS },
      (error: Error | null, rows: unknown, fields?: { name: string }[]) => {
        if (error) reject(error);
        else resolve({ rows, fields });
      }
    );
  });
}

async function readMysql(
  connection: RawConnection,
  sql: string,
  fetchCount: number
): Promise<FetchedRows> {
  try {
    // sql_select_limit caps rows server-side without rewriting the query.
    await mysqlQuery(
      connection,
      `SET SESSION sql_select_limit = ${fetchCount}`
    );
    await mysqlQuery(connection, 'START TRANSACTION READ ONLY');
    const { rows, fields } = await mysqlQuery(connection, sql);
    const resultRows = Array.isArray(rows)
      ? (rows as Record<string, unknown>[])
      : [];
    return {
      columns: (fields ?? []).map(field => field.name),
      rows: resultRows,
    };
  } finally {
    await mysqlQuery(connection, 'ROLLBACK');
    await mysqlQuery(connection, 'SET SESSION sql_select_limit = DEFAULT');
  }
}

function sqliteExec(db: RawConnection, sql: string): Promise<void> {
  return new Promise((resolve, reject) => {
    db.exec(sql, (error: Error | null) => (error ? reject(error) : resolve()));
  });
}

async function readSqlite(
  db: RawConnection,
  sql: string,
  fetchCount: number
): Promise<FetchedRows> {
  await sqliteExec(db, 'PRAGMA query_only = ON');

  try {
    const statement = db.prepare(sql);
    const rows: Record<string, unknown>[] = [];

    try {
      while (rows.length < fetchCount) {
        const row = await new Promise<Record<string, unknown> | undefined>(
          (resolve, reject) =>
            statement.get(
              (error: Error | null, value?: Record<string, unknown>) =>
                error ? reject(error) : resolve(value)
            )
        );
        if (!row) break;
        rows.push(row);
      }
    } finally {
      statement.finalize();
    }

    return { columns: Object.keys(rows[0] ?? {}), rows };
  } finally {
    await sqliteExec(db, 'PRAGMA query_only = OFF');
  }
}

async function readOracle(
  connection: RawConnection,
  sql: string,
  fetchCount: number
): Promise<FetchedRows> {
  const oracledb = (await import('oracledb')).default;
  const previousCallTimeout = connection.callTimeout;
  connection.callTimeout = MCP_QUERY_TIMEOUT_MS;

  try {
    // SET TRANSACTION must be the first statement of a transaction.
    await connection.rollback();
    await connection.execute('SET TRANSACTION READ ONLY');
    const result = await connection.execute(sql, [], {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      maxRows: fetchCount,
    });
    return {
      columns: (result.metaData ?? []).map(
        (meta: { name: string }) => meta.name
      ),
      rows: (result.rows ?? []) as Record<string, unknown>[],
    };
  } finally {
    await connection.rollback();
    connection.callTimeout = previousCallTimeout;
  }
}

const READ_ONLY_READERS: Partial<
  Record<
    DatabaseClientType,
    (
      connection: RawConnection,
      sql: string,
      fetchCount: number
    ) => Promise<FetchedRows>
  >
> = {
  [DatabaseClientType.POSTGRES]: readPostgres,
  [DatabaseClientType.MYSQL]: readMysql,
  [DatabaseClientType.MARIADB]: readMysql,
  [DatabaseClientType.SQLITE3]: readSqlite,
  [DatabaseClientType.ORACLE]: readOracle,
};

/** Adapters without a pooled raw connection (Cloudflare D1, Turso) expose no knex client. */
function hasRawConnectionPool(adapter: IDatabaseAdapter) {
  return Boolean(adapter.knex?.client?.acquireConnection);
}

export async function executeReadOnlyQuery(
  adapter: IDatabaseAdapter,
  sql: string,
  limit: number
): Promise<McpQueryResult> {
  const startedAt = performance.now();
  const reader = READ_ONLY_READERS[adapter.dbType];

  if (!reader || !hasRawConnectionPool(adapter)) {
    // Managed providers: SQL guard only (see assertReadOnlySql).
    const result = await adapter.rawQuery<Record<string, unknown>>(sql);
    return finalize(
      { columns: Object.keys(result[0] ?? {}), rows: result },
      limit,
      startedAt
    );
  }

  const connection = await adapter.acquireRawConnection();

  try {
    return finalize(await reader(connection, sql, limit + 1), limit, startedAt);
  } finally {
    await adapter.releaseRawConnection(connection);
  }
}

// ── Write execution: only for connections with write access. ────────────────

export async function executeWriteQuery(
  adapter: IDatabaseAdapter,
  sql: string,
  limit: number
): Promise<McpQueryResult> {
  const startedAt = performance.now();
  const result = await adapter.rawOut<unknown[]>(sql);
  const columns = (result.fields ?? []).map(
    (field: { name?: string }, index: number) =>
      field?.name ?? `column_${index + 1}`
  );
  const rows = result.rows.map(row =>
    Array.isArray(row)
      ? Object.fromEntries(columns.map((column, index) => [column, row[index]]))
      : (row as Record<string, unknown>)
  );

  return finalize(
    { columns, rows, rowCount: result.rowCount ?? rows.length },
    limit,
    startedAt
  );
}
