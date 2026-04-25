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
    tableID: 0,
    columnID: index,
    dataTypeID: field.columnType ?? 0,
    dataTypeSize: field.columnLength ?? 0,
    dataTypeModifier: 0,
    format: 'text',
  }));
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
      connection,
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
