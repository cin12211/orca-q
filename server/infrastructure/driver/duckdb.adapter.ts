import type {
  DuckDBConnection,
  DuckDBInstance,
  DuckDBResultReader,
  DuckDBValue,
} from '@duckdb/node-api';
import knex, { type Knex } from 'knex';
import { accessSync, constants as fsConstants } from 'node:fs';
import { Readable } from 'node:stream';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { DatabaseField } from '~/core/types';
import { BaseDatabaseAdapter } from './base.adapter';
import type { RawQueryResult } from './types';

export const DUCKDB_IN_MEMORY_PATH = ':memory:';

const DUCKDB_URL_PREFIX = 'duckdb://';
const LEADING_SQL_COMMENTS = /^(\s|--[^\n]*\n|\/\*[\s\S]*?\*\/)+/;

function assertReadableDuckDbFile(filename: string) {
  if (filename === DUCKDB_IN_MEMORY_PATH) {
    return;
  }

  try {
    accessSync(filename, fsConstants.F_OK);
  } catch {
    throw new Error(`DuckDB database file was not found: ${filename}`);
  }

  try {
    accessSync(filename, fsConstants.R_OK);
  } catch {
    throw new Error(`DuckDB database file is not readable: ${filename}`);
  }
}

function normalizeDuckDbFilename(fileName: string) {
  const normalizedPath = fileName.replace(/\\/g, '/');

  if (normalizedPath.replace(/^\//, '') === DUCKDB_IN_MEMORY_PATH) {
    return DUCKDB_IN_MEMORY_PATH;
  }

  if (/^\/[A-Za-z]:\//.test(normalizedPath)) {
    return normalizedPath.slice(1);
  }

  return normalizedPath;
}

function resolveDuckDbFilename(
  connection: string | Knex.Config['connection']
): string {
  if (typeof connection === 'string') {
    return normalizeDuckDbFilename(
      connection.startsWith(DUCKDB_URL_PREFIX)
        ? connection.slice(DUCKDB_URL_PREFIX.length)
        : connection
    );
  }

  const candidate = (connection || {}) as {
    filename?: string;
    filePath?: string;
  };
  const fileName = candidate.filename || candidate.filePath;

  if (!fileName) {
    throw new Error('DuckDB connections require a filename.');
  }

  return normalizeDuckDbFilename(fileName);
}

function normalizeDuckDbBinding(value: unknown): DuckDBValue {
  if (value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }

  return value as DuckDBValue;
}

function toDuckDbBindings(bindings: unknown[]) {
  return bindings.length ? bindings.map(normalizeDuckDbBinding) : undefined;
}

function createSyntheticFields(columnNames: string[]): DatabaseField[] {
  return columnNames.map((name, index) => ({
    name,
    tableID: 0,
    columnID: index,
    dataTypeID: 0,
    dataTypeSize: 0,
    dataTypeModifier: 0,
    format: 'text',
  }));
}

function inferDuckDbCommand(sql: string) {
  return (
    sql.replace(LEADING_SQL_COMMENTS, '').trim().split(/\s+/, 1)[0] || ''
  ).toUpperCase();
}

async function loadDuckDbDriver() {
  try {
    // Imported lazily so a platform without a native binding only fails DuckDB
    // connections rather than every server route sharing this module graph.
    return await import('@duckdb/node-api');
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load the DuckDB driver: ${reason}`);
  }
}

/**
 * One connection running one statement at a time, so temp tables, `USE` and
 * `SET` carry across statements the way they do in a SQL console.
 */
class DuckDbSession {
  private connection?: Promise<DuckDBConnection>;
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly connect: () => Promise<DuckDBConnection>) {}

  getConnection(): Promise<DuckDBConnection> {
    this.connection ??= this.connect().catch(error => {
      this.connection = undefined;
      throw error;
    });

    return this.connection;
  }

  async lock(): Promise<() => void> {
    const previous = this.queue;
    let release: () => void = () => {};

    this.queue = new Promise<void>(resolve => {
      release = resolve;
    });
    await previous;

    return release;
  }

  async run<T>(task: (connection: DuckDBConnection) => Promise<T>): Promise<T> {
    const release = await this.lock();

    try {
      return await task(await this.getConnection());
    } finally {
      release();
    }
  }

  async interrupt(): Promise<void> {
    const connection = await this.connection?.catch(() => undefined);
    connection?.interrupt();
  }

  async close(): Promise<void> {
    const release = await this.lock();

    try {
      const connection = await this.connection?.catch(() => undefined);
      connection?.closeSync();
      this.connection = undefined;
    } finally {
      release();
    }
  }
}

export type DuckDbStreamEvent =
  | { type: 'meta'; fields: DatabaseField[]; command: string }
  | { type: 'rows'; rows: unknown[][] }
  | { type: 'done'; rowCount: number };

export class DuckDbAdapter extends BaseDatabaseAdapter {
  private readonly filename: string;
  private instance?: Promise<DuckDBInstance>;
  // User statements run on their own session so a long query never holds up
  // schema browsing and table reads, which stay on the catalog session.
  private readonly querySession = new DuckDbSession(() =>
    this.openConnection()
  );
  private readonly catalogSession = new DuckDbSession(() =>
    this.openConnection()
  );
  private releaseRawSession?: () => void;

  constructor(connection: string | Knex.Config['connection']) {
    const filename = resolveDuckDbFilename(connection);
    assertReadableDuckDbFile(filename);

    // Knex has no DuckDB client: it only compiles named bindings here and never
    // connects. DuckDB accepts the `$1` placeholders of the Postgres compiler.
    super(
      DatabaseClientType.DUCKDB,
      { filename },
      knex({ client: DatabaseClientType.POSTGRES })
    );
    this.filename = filename;
  }

  private getInstance(): Promise<DuckDBInstance> {
    // fromCache shares one database per path inside this process, which is what
    // lets a health check open a file already held by a cached adapter.
    this.instance ??= loadDuckDbDriver()
      .then(({ DuckDBInstance }) => DuckDBInstance.fromCache(this.filename))
      .catch(error => {
        this.instance = undefined;
        throw error;
      });

    return this.instance;
  }

  private async openConnection(): Promise<DuckDBConnection> {
    return (await this.getInstance()).connect();
  }

  protected async _rawQuery<T = any>(
    sql: string,
    bindings: any[] = []
  ): Promise<T[]> {
    const reader = await this.catalogSession.run(connection =>
      connection.runAndReadAll(sql, toDuckDbBindings(bindings))
    );
    const columnNames = reader.deduplicatedColumnNames();

    return reader
      .getRowsJson()
      .map(row =>
        Object.fromEntries(columnNames.map((name, i) => [name, row[i]]))
      ) as T[];
  }

  protected async _rawOut<T = any>(
    sql: string,
    bindings: any[] = []
  ): Promise<RawQueryResult<T>> {
    const { ResultReturnType } = await loadDuckDbDriver();
    const reader = await this.querySession.run(connection =>
      connection.runAndReadAll(sql, toDuckDbBindings(bindings))
    );
    const command = inferDuckDbCommand(sql);

    if (reader.returnType !== ResultReturnType.QUERY_RESULT) {
      return { rows: [], fields: [], rowCount: reader.rowsChanged, command };
    }

    const rows = reader.getRowsJson() as T[];

    return {
      rows,
      fields: createSyntheticFields(reader.deduplicatedColumnNames()),
      rowCount: rows.length,
      command,
    };
  }

  /** Reads a result chunk by chunk, holding the query session until it ends. */
  async *streamResult(
    sql: string,
    bindings: unknown[] = []
  ): AsyncGenerator<DuckDbStreamEvent> {
    const { ResultReturnType } = await loadDuckDbDriver();
    const release = await this.querySession.lock();

    try {
      const connection = await this.querySession.getConnection();
      const result = await connection.stream(sql, toDuckDbBindings(bindings));
      const command = inferDuckDbCommand(sql);

      try {
        if (result.returnType !== ResultReturnType.QUERY_RESULT) {
          yield { type: 'meta', fields: [], command };
          yield { type: 'done', rowCount: result.rowsChanged };
          return;
        }

        yield {
          type: 'meta',
          fields: createSyntheticFields(result.deduplicatedColumnNames()),
          command,
        };

        let rowCount = 0;

        for await (const rows of result.yieldRowsJson()) {
          rowCount += rows.length;
          yield { type: 'rows', rows };
        }

        yield { type: 'done', rowCount };
      } finally {
        result.closeSync();
      }
    } finally {
      release();
    }
  }

  /** Stops the statement running on the query session, if any. */
  interruptQuery(): Promise<void> {
    return this.querySession.interrupt();
  }

  protected _streamQuery(
    sql: string,
    bindings: any[] = [],
    _options: Record<string, any> = {}
  ): Readable {
    const adapter = this;

    return Readable.from(
      (async function* () {
        yield* await adapter._rawQuery<Record<string, unknown>>(sql, bindings);
      })()
    );
  }

  protected _getNativeSql(
    sql: string,
    bindings: Knex.RawBinding
  ): Knex.SqlNative {
    return this.knex.raw(sql, bindings).toSQL().toNative();
  }

  /** Holds the query session until `releaseRawConnection`, e.g. for a transaction. */
  override async acquireRawConnection(): Promise<DuckDBConnection> {
    const release = await this.querySession.lock();

    try {
      const connection = await this.querySession.getConnection();
      this.releaseRawSession = release;
      return connection;
    } catch (error) {
      release();
      throw error;
    }
  }

  override async releaseRawConnection(): Promise<void> {
    this.releaseRawSession?.();
    this.releaseRawSession = undefined;
  }

  override async verifyConnection(): Promise<void> {
    await this._rawQuery('SELECT 1');
  }

  override async destroy(): Promise<void> {
    await Promise.all([this.querySession.close(), this.catalogSession.close()]);

    const instance = await this.instance?.catch(() => undefined);
    // Only drops this adapter's handle; the database closes, and its file lock
    // is freed, once no other adapter shares it through the cache.
    instance?.closeSync();
    this.instance = undefined;
    await this.knex.destroy();
  }
}
