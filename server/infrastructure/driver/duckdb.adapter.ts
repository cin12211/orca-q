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

export class DuckDbAdapter extends BaseDatabaseAdapter {
  private readonly filename: string;
  private instance?: DuckDBInstance;
  private sessionConnection?: Promise<DuckDBConnection>;
  private sessionQueue: Promise<void> = Promise.resolve();
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

  private async openConnection(): Promise<DuckDBConnection> {
    const { DuckDBInstance } = await loadDuckDbDriver();

    // fromCache shares one database per path inside this process, which is what
    // lets a health check open a file already held by a cached adapter.
    this.instance = await DuckDBInstance.fromCache(this.filename);

    return this.instance.connect();
  }

  private getConnection(): Promise<DuckDBConnection> {
    this.sessionConnection ??= this.openConnection().catch(error => {
      this.sessionConnection = undefined;
      throw error;
    });

    return this.sessionConnection;
  }

  /**
   * One connection serves the adapter, one statement at a time, so temp tables,
   * `USE` and `SET` carry across queries the way they do in a SQL console.
   */
  private async lockSession(): Promise<() => void> {
    const previous = this.sessionQueue;
    let release: () => void = () => {};

    this.sessionQueue = new Promise<void>(resolve => {
      release = resolve;
    });
    await previous;

    return release;
  }

  private async withSession<T>(
    task: (connection: DuckDBConnection) => Promise<T>
  ): Promise<T> {
    const release = await this.lockSession();

    try {
      return await task(await this.getConnection());
    } finally {
      release();
    }
  }

  private async readAll(
    sql: string,
    bindings: unknown[]
  ): Promise<DuckDBResultReader> {
    return this.withSession(connection =>
      connection.runAndReadAll(
        sql,
        bindings.length ? bindings.map(normalizeDuckDbBinding) : undefined
      )
    );
  }

  protected async _rawQuery<T = any>(
    sql: string,
    bindings: any[] = []
  ): Promise<T[]> {
    const reader = await this.readAll(sql, bindings);
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
    const reader = await this.readAll(sql, bindings);
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

  /** Holds the session until `releaseRawConnection`, e.g. for a transaction. */
  override async acquireRawConnection(): Promise<DuckDBConnection> {
    const release = await this.lockSession();

    try {
      const connection = await this.getConnection();
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
    await this.readAll('SELECT 1', []);
  }

  override async destroy(): Promise<void> {
    const release = await this.lockSession();

    try {
      const connection = await this.sessionConnection?.catch(() => undefined);
      connection?.closeSync();
      // Only drops this adapter's handle; the database closes, and its file
      // lock is freed, once no other adapter shares it through the cache.
      this.instance?.closeSync();
      this.sessionConnection = undefined;
      this.instance = undefined;
      await this.knex.destroy();
    } finally {
      release();
    }
  }
}
