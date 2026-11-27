import knex, { type Knex } from 'knex';
import type { FieldPacket, ResultSetHeader } from 'mysql2';
import type { Readable } from 'node:stream';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { DatabaseField } from '~/core/types';
import { BaseDatabaseAdapter } from './base.adapter';
import type { RawQueryResult } from './types';

type MysqlQueryRows<T = unknown> = T[] | ResultSetHeader;

export function normalizeMysqlFields(
  fields: FieldPacket[] = []
): DatabaseField[] {
  return fields.map((field, index) => ({
    name: field.name,
    schemaName: field.db || undefined,
    tableName: field.orgTable || field.table || undefined,
    sourceColumnName: field.orgName || field.name,
    tableID: 0,
    columnID: index,
    dataTypeID: field.columnType ?? 0,
    dataTypeSize: field.columnLength ?? 0,
    dataTypeModifier: 0,
    format: 'text',
  }));
}

/**
 * mysql2 turns DATE / DATETIME / TIMESTAMP into JS `Date`s by default. Those
 * reach the browser as UTC ISO strings (`2024-01-15T03:20:30.000Z` for a
 * `2024-01-15 10:20:30` value at +07, a DATE as the previous day at UTC+),
 * and any edit or WHERE clause built from them no longer matches the stored
 * value. `dateStrings` returns them exactly as MySQL prints them, which is
 * also the literal MySQL accepts back.
 */
const MYSQL_TYPE_OPTIONS = { dateStrings: true } as const;

export function withMysqlTypeOptions(
  connection: string | Knex.Config['connection']
): string | Knex.Config['connection'] {
  if (typeof connection === 'string') {
    // knex JSON-parses URL query params into the mysql2 connection options.
    const url = new URL(connection);
    for (const [key, value] of Object.entries(MYSQL_TYPE_OPTIONS)) {
      url.searchParams.set(key, String(value));
    }
    return url.toString();
  }

  if (typeof connection === 'object' && connection !== null) {
    return {
      ...(connection as object),
      ...MYSQL_TYPE_OPTIONS,
    } as Knex.Config['connection'];
  }

  return connection;
}

function inferMysqlCommand(sql: string) {
  return sql.trim().split(/\s+/, 1)[0]?.toUpperCase() || '';
}

export class MysqlAdapter extends BaseDatabaseAdapter {
  constructor(
    connection: string | Knex.Config['connection'],
    dbType: DatabaseClientType = DatabaseClientType.MYSQL
  ) {
    const knexInstance = knex({
      client: DatabaseClientType.MYSQL2,
      connection: withMysqlTypeOptions(connection),
      pool: {
        min: 1,
        max: 10,
        idleTimeoutMillis: 5 * 60 * 1000,
      },
      log: {
        warn(message) {
          console.warn('[MysqlAdapter]', message);
        },
        error(message) {
          console.error('[MysqlAdapter]', message);
        },
        deprecate(message) {
          console.warn('[MysqlAdapter] Deprecation:', message);
        },
        debug(message) {
          console.debug('[MysqlAdapter]', message);
        },
      },
    });

    super(dbType, connection, knexInstance);
  }

  private async queryWithMetadata<T = unknown>(
    sql: string,
    bindings: any[] = [],
    rowsAsArray = false
  ): Promise<{ rows: MysqlQueryRows<T>; fields: FieldPacket[] }> {
    const connection = await this.acquireRawConnection();

    try {
      return await new Promise((resolve, reject) => {
        connection.query(
          {
            sql,
            values: bindings,
            rowsAsArray,
          },
          (
            error: Error | null,
            rows: MysqlQueryRows<T>,
            fields: FieldPacket[]
          ) => {
            if (error) {
              reject(error);
              return;
            }

            resolve({
              rows,
              fields: fields ?? [],
            });
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
    const { rows } = await this.queryWithMetadata<T>(sql, bindings);
    return Array.isArray(rows) ? (rows as T[]) : [];
  }

  protected async _rawOut<T = any>(
    sql: string,
    bindings: any[] = []
  ): Promise<RawQueryResult<T>> {
    const { rows, fields } = await this.queryWithMetadata<T>(
      sql,
      bindings,
      true
    );

    if (Array.isArray(rows)) {
      return {
        rows: rows as T[],
        fields: normalizeMysqlFields(fields),
        rowCount: rows.length,
        command: inferMysqlCommand(sql),
      };
    }

    return {
      rows: [],
      fields: normalizeMysqlFields(fields),
      rowCount: rows.affectedRows,
      command: inferMysqlCommand(sql),
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
