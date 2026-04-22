import knex, { type Knex } from 'knex';
import { accessSync, constants as fsConstants } from 'node:fs';
import { Readable } from 'node:stream';
import type { RunResult } from 'sqlite3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { DatabaseField } from '~/core/types';
import { BaseDatabaseAdapter } from './base.adapter';
import type { RawQueryResult } from './types';

function assertReadableSqliteFile(filename: string) {
  if (filename === ':memory:') {
    return;
  }

  try {
    accessSync(filename, fsConstants.F_OK);
  } catch {
    throw new Error(`SQLite database file was not found: ${filename}`);
  }

  try {
    accessSync(filename, fsConstants.R_OK);
  } catch {
    throw new Error(`SQLite database file is not readable: ${filename}`);
  }
}

function normalizeSqliteFilename(fileName: string) {
  const normalizedPath = decodeURIComponent(fileName).replace(/\\/g, '/');

  if (/^\/[A-Za-z]:\//.test(normalizedPath)) {
    return normalizedPath.slice(1);
  }

  return normalizedPath;
}

function normalizeSqliteConnection(
  connection: string | Knex.Config['connection']
): Knex.Config['connection'] {
  if (typeof connection === 'string') {
    if (connection.startsWith('sqlite3://')) {
      const url = new URL(connection);
      const filename = normalizeSqliteFilename(url.pathname);
      assertReadableSqliteFile(filename);
      return {
        filename,
      };
    }

    const filename = normalizeSqliteFilename(connection);
    assertReadableSqliteFile(filename);

    return {
      filename,
    };
  }

  const candidate = (connection || {}) as Record<string, any>;

  if (candidate.filename) {
    const filename = normalizeSqliteFilename(candidate.filename);
    assertReadableSqliteFile(filename);
    return {
      filename,
    };
  }

  if (candidate.filePath) {
    const filename = normalizeSqliteFilename(candidate.filePath);
    assertReadableSqliteFile(filename);
    return {
      filename,
    };
  }

  throw new Error('SQLite connections require a filename.');
}

function createSyntheticFields(row?: Record<string, unknown>): DatabaseField[] {
  return Object.keys(row || {}).map((name, index) => ({
    name,
    tableID: 0,
    columnID: index,
    dataTypeID: 0,
    dataTypeSize: 0,
    dataTypeModifier: 0,
    format: 'text',
  }));
}

function inferSqliteCommand(sql: string) {
  return sql.trim().split(/\s+/, 1)[0]?.toUpperCase() || '';
}

export class SqliteAdapter extends BaseDatabaseAdapter {
  constructor(connection: string | Knex.Config['connection']) {
    const normalizedConnection = normalizeSqliteConnection(connection);
    const knexInstance = knex({
      client: DatabaseClientType.SQLITE3,
      connection: normalizedConnection,
      useNullAsDefault: true,
      pool: {
        min: 1,
        max: 1,
        idleTimeoutMillis: 5 * 60 * 1000,
      },
      log: {
        warn(message) {
          console.warn('[SqliteAdapter]', message);
        },
        error(message) {
          console.error('[SqliteAdapter]', message);
        },
        deprecate(message) {
          console.warn('[SqliteAdapter] Deprecation:', message);
        },
        debug(message) {
          console.debug('[SqliteAdapter]', message);
        },
      },
    });

    super(DatabaseClientType.SQLITE3, normalizedConnection, knexInstance);
  }

  private async all<T = Record<string, unknown>>(
    sql: string,
    bindings: any[] = []
  ): Promise<T[]> {
    const connection = await this.acquireRawConnection();

    try {
      return await new Promise((resolve, reject) => {
        connection.all(sql, bindings, (error: Error | null, rows: T[]) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(rows || []);
        });
      });
    } finally {
      await this.releaseRawConnection(connection);
    }
  }

  private async run(
    sql: string,
    bindings: any[] = []
  ): Promise<RunResult & { rows?: Record<string, unknown>[] }> {
    const connection = await this.acquireRawConnection();

    try {
      return await new Promise((resolve, reject) => {
        connection.run(
          sql,
          bindings,
          function (this: RunResult, error: Error | null) {
            if (error) {
              reject(error);
              return;
            }

            resolve(this);
          }
        );
      });
    } finally {
      await this.releaseRawConnection(connection);
    }
  }

  protected async _rawQuery<T = any>(
    sql: string,
    bindings: any[] = []
  ): Promise<T[]> {
    return this.all<T>(sql, bindings);
  }

  protected async _rawOut<T = any>(
    sql: string,
    bindings: any[] = []
  ): Promise<RawQueryResult<T>> {
    const trimmedQuery = sql.trim().toUpperCase();
    const isSelectLike =
      trimmedQuery.startsWith('SELECT') ||
      trimmedQuery.startsWith('WITH') ||
      trimmedQuery.startsWith('PRAGMA') ||
      trimmedQuery.startsWith('EXPLAIN');

    if (isSelectLike) {
      const rows = await this.all<Record<string, unknown>>(sql, bindings);

      return {
        rows: rows as T[],
        fields: createSyntheticFields(rows[0]),
        rowCount: rows.length,
        command: inferSqliteCommand(sql),
      };
    }

    const result = await this.run(sql, bindings);

    return {
      rows: [],
      fields: [],
      rowCount: result.changes || 0,
      command: inferSqliteCommand(sql),
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
        const rows = await adapter.all<Record<string, unknown>>(sql, bindings);

        for (const row of rows) {
          yield row;
        }
      })()
    );
  }

  protected _getNativeSql(
    sql: string,
    bindings: Knex.RawBinding
  ): Knex.SqlNative {
    return this.knex.raw(sql, bindings).toSQL().toNative();
  }
}
