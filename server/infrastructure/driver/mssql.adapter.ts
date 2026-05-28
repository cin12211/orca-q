import knex, { type Knex } from 'knex';
import { Readable } from 'node:stream';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { DatabaseField } from '~/core/types';
import { BaseDatabaseAdapter } from './base.adapter';
import type { RawQueryResult } from './types';

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

function inferMssqlCommand(sql: string) {
  return sql.trim().split(/\s+/, 1)[0]?.toUpperCase() || '';
}

export class MssqlAdapter extends BaseDatabaseAdapter {
  constructor(connection: string | Knex.Config['connection']) {
    const knexInstance = knex({
      client: DatabaseClientType.MSSQL,
      connection,
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

    super(DatabaseClientType.MSSQL, connection, knexInstance);
  }

  protected async _rawQuery<T = any>(
    sql: string,
    bindings: any[] = []
  ): Promise<T[]> {
    const result = await this.knex.raw(sql, bindings);
    return Array.isArray(result) ? (result as T[]) : [];
  }

  protected async _rawOut<T = any>(
    sql: string,
    bindings: any[] = []
  ): Promise<RawQueryResult<T>> {
    const result = await this.knex.raw(sql, bindings);
    const rowsArray = Array.isArray(result) ? result : [];

    const fields = createSyntheticFields(rowsArray[0] as Record<string, unknown>);
    const rows = rowsArray.map(row => fields.map(f => row[f.name])) as T[];

    return {
      rows,
      fields,
      rowCount: rows.length,
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
