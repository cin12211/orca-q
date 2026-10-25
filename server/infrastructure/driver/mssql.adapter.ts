import knex, { type Knex } from 'knex';
import type { Readable } from 'node:stream';
import { Request, TYPES, type Connection as TediousConnection } from 'tedious';
import type { ColumnMetadata } from 'tedious/lib/token/colmetadata-token-parser';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { DatabaseField } from '~/core/types';
import { BaseDatabaseAdapter } from './base.adapter';
import { normalizeMssqlConnection } from './mssql/connection';
import { mapArrayRowsToObjects } from './result-rows';
import { assertMinimumServerVersion } from './server-version';
import type { RawQueryResult } from './types';

interface TediousColumnValue {
  value: unknown;
  metadata: ColumnMetadata;
}

export interface MssqlResultSet {
  fields: DatabaseField[];
  rows: unknown[][];
}

export interface MssqlBatchResult {
  resultSets: MssqlResultSet[];
  rowsAffected: number;
  messages: string[];
}

export interface MssqlRowStreamHandlers {
  onColumns(fields: DatabaseField[]): void;
  onRow(row: unknown[]): void;
}

// Azure SQL Database, Managed Instance, Edge and Synapse report their own
// version numbering (e.g. 12.0 for Azure SQL Database); the box-product
// minimum does not apply to them.
const CLOUD_ENGINE_EDITIONS = new Set([5, 6, 8, 9, 11, 12]);

function toDatabaseFields(columns: ColumnMetadata[]): DatabaseField[] {
  return columns.map((column, index) => ({
    name: column.colName || `column_${index + 1}`,
    tableID: 0,
    columnID: index,
    dataTypeID: 0,
    dataTypeSize: column.dataLength ?? 0,
    dataTypeModifier: 0,
    format: (column.type?.name ?? 'text').toLowerCase(),
  }));
}

function normalizeColumnValue(value: unknown): unknown {
  // Binary columns arrive as Buffers; show them the way SSMS does.
  if (Buffer.isBuffer(value)) {
    return `0x${value.toString('hex').toUpperCase()}`;
  }

  return value;
}

/** First keyword of a statement, ignoring leading comments (e.g. `SELECT`). */
export function inferMssqlCommand(sql: string): string {
  const withoutComments = sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--.*$/gm, ' ');
  return withoutComments.trim().split(/\s+/, 1)[0]?.toUpperCase() || 'QUERY';
}

function bindParameter(request: Request, index: number, value: unknown) {
  const name = `p${index}`;

  if (value === null || value === undefined) {
    request.addParameter(name, TYPES.NVarChar, null);
    return;
  }

  if (typeof value === 'boolean') {
    request.addParameter(name, TYPES.Bit, value);
    return;
  }

  if (typeof value === 'number') {
    if (!Number.isInteger(value)) {
      request.addParameter(name, TYPES.Float, value);
      return;
    }

    request.addParameter(
      name,
      Math.abs(value) > 2_147_483_647 ? TYPES.BigInt : TYPES.Int,
      value
    );
    return;
  }

  if (typeof value === 'bigint') {
    request.addParameter(name, TYPES.BigInt, value.toString());
    return;
  }

  if (value instanceof Date) {
    request.addParameter(name, TYPES.DateTime2, value);
    return;
  }

  if (Buffer.isBuffer(value)) {
    request.addParameter(name, TYPES.VarBinary, value);
    return;
  }

  request.addParameter(
    name,
    TYPES.NVarChar,
    typeof value === 'string' ? value : JSON.stringify(value)
  );
}

/**
 * SQL Server adapter. Connections are pooled through knex's `mssql` client
 * (tedious), but statements run on the raw tedious connection so that every
 * result set of a batch, the affected-row count and PRINT messages are kept.
 * knex's own `raw()` merges the rows of all result sets into one array.
 */
export class MssqlAdapter extends BaseDatabaseAdapter {
  constructor(connection: string | Knex.Config['connection']) {
    const normalizedConnection = normalizeMssqlConnection(connection);
    const knexInstance = knex({
      client: DatabaseClientType.MSSQL,
      connection: normalizedConnection as unknown as Knex.Config['connection'],
      pool: {
        min: 1,
        max: 10,
        idleTimeoutMillis: 5 * 60 * 1000,
      },
      log: {
        warn(message) {
          console.warn('[MssqlAdapter]', message);
        },
        error(message) {
          console.error('[MssqlAdapter]', message);
        },
        deprecate(message) {
          console.warn('[MssqlAdapter] Deprecation:', message);
        },
        debug(message) {
          console.debug('[MssqlAdapter]', message);
        },
      },
    });

    super(
      DatabaseClientType.MSSQL,
      normalizedConnection as unknown as Knex.Config['connection'],
      knexInstance
    );
  }

  override async verifyConnection(): Promise<void> {
    await this.rawQuery('SELECT 1 AS ok');
    await this.assertSupportedServerVersion();
  }

  override async assertSupportedServerVersion(): Promise<void> {
    const [row] = await this.rawQuery<{
      product_version: string | null;
      engine_edition: number | null;
    }>(
      `SELECT
        CAST(SERVERPROPERTY('ProductVersion') AS NVARCHAR(128)) AS product_version,
        CAST(SERVERPROPERTY('EngineEdition') AS INT) AS engine_edition`
    );

    if (row?.engine_edition && CLOUD_ENGINE_EDITIONS.has(row.engine_edition)) {
      return;
    }

    assertMinimumServerVersion(
      DatabaseClientType.MSSQL,
      row?.product_version ?? ''
    );
  }

  /**
   * Runs a batch and keeps every result set. With `stream` handlers, rows are
   * handed over as they arrive instead of being buffered.
   */
  async executeBatch(
    sql: string,
    bindings: unknown[] = [],
    stream?: MssqlRowStreamHandlers
  ): Promise<MssqlBatchResult> {
    const connection = (await this.acquireRawConnection()) as TediousConnection;

    try {
      return await this.runRequest(connection, sql, bindings, stream);
    } finally {
      await this.releaseRawConnection(connection);
    }
  }

  /**
   * Runs statements one by one inside a single transaction on one connection.
   * XACT_ABORT makes any runtime error roll the whole transaction back.
   */
  async executeInTransaction(
    statements: string[]
  ): Promise<MssqlBatchResult[]> {
    const connection = (await this.acquireRawConnection()) as TediousConnection;
    const results: MssqlBatchResult[] = [];

    try {
      await this.runRequest(
        connection,
        'SET XACT_ABORT ON; BEGIN TRANSACTION;',
        []
      );

      for (const statement of statements) {
        results.push(await this.runRequest(connection, statement, []));
      }

      await this.runRequest(connection, 'COMMIT TRANSACTION;', []);
      return results;
    } catch (error) {
      await this.runRequest(
        connection,
        'IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;',
        []
      ).catch(() => {});
      throw error;
    } finally {
      await this.releaseRawConnection(connection);
    }
  }

  private runRequest(
    connection: TediousConnection,
    sql: string,
    bindings: unknown[],
    stream?: MssqlRowStreamHandlers
  ): Promise<MssqlBatchResult> {
    return new Promise((resolve, reject) => {
      const resultSets: MssqlResultSet[] = [];
      const messages: string[] = [];
      let rowsAffected = 0;
      let current: MssqlResultSet | null = null;

      const request = new Request(sql, error => {
        connection.removeListener('infoMessage', onInfo);

        if (error) {
          reject(error);
          return;
        }

        resolve({ resultSets, rowsAffected, messages });
      });

      const onInfo = (info: { message: string }) => {
        messages.push(info.message);
      };

      connection.on('infoMessage', onInfo);

      request.on('columnMetadata', (columns: ColumnMetadata[] | object) => {
        const list = Array.isArray(columns)
          ? columns
          : (Object.values(columns) as ColumnMetadata[]);
        current = { fields: toDatabaseFields(list), rows: [] };
        resultSets.push(current);
        stream?.onColumns(current.fields);
      });

      request.on('row', (columns: TediousColumnValue[]) => {
        const row = columns.map(column => normalizeColumnValue(column.value));

        if (stream) {
          stream.onRow(row);
          return;
        }

        current?.rows.push(row);
      });

      const countRows = (rowCount: number | undefined) => {
        if (typeof rowCount === 'number') rowsAffected += rowCount;
      };

      request.on('done', countRows);
      request.on('doneInProc', countRows);

      // execSql wraps the text in sp_executesql, which scopes it like a
      // procedure: BEGIN/COMMIT TRANSACTION split across calls then fails with
      // error 266. Parameterless SQL runs as a plain batch instead.
      if (bindings.length === 0) {
        connection.execSqlBatch(request);
        return;
      }

      bindings.forEach((value, index) => bindParameter(request, index, value));

      connection.execSql(request);
    });
  }

  // Without bindings the SQL runs verbatim, so a literal `?` in user SQL is
  // never mistaken for a knex placeholder.
  private toNative(sql: string, bindings: Knex.RawBinding): Knex.SqlNative {
    if (Array.isArray(bindings) && bindings.length === 0) {
      return { sql, bindings: [] };
    }

    return this._getNativeSql(sql, bindings);
  }

  /** Last result set that returned columns (what a single SELECT produces). */
  private pickResultSet(result: MssqlBatchResult): MssqlResultSet | undefined {
    return result.resultSets[result.resultSets.length - 1];
  }

  protected async _rawQuery<T = any>(
    sql: string,
    bindings: any[] = []
  ): Promise<T[]> {
    const native = this.toNative(sql, bindings);
    const result = await this.executeBatch(
      native.sql,
      Array.from(native.bindings ?? [])
    );
    const resultSet = this.pickResultSet(result);

    if (!resultSet) {
      return [];
    }

    return mapArrayRowsToObjects(resultSet.rows, resultSet.fields) as T[];
  }

  protected async _rawOut<T = any>(
    sql: string,
    bindings: any[] = []
  ): Promise<RawQueryResult<T>> {
    const native = this.toNative(sql, bindings);
    const result = await this.executeBatch(
      native.sql,
      Array.from(native.bindings ?? [])
    );
    const resultSet = this.pickResultSet(result);

    return {
      rows: (resultSet?.rows ?? []) as T[],
      fields: resultSet?.fields ?? [],
      rowCount: resultSet ? resultSet.rows.length : result.rowsAffected,
      command: inferMssqlCommand(sql),
    };
  }

  protected _streamQuery(
    sql: string,
    bindings: any[] = [],
    options: Record<string, any> = {}
  ): Readable {
    return this.knex.raw(sql, bindings).stream(options) as unknown as Readable;
  }

  protected _getNativeSql(
    sql: string,
    bindings: Knex.RawBinding
  ): Knex.SqlNative {
    return this.knex.raw(sql, bindings).toSQL().toNative();
  }
}
