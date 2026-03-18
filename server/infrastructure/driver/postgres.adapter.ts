import knex, { type Knex } from 'knex';
import type { Readable } from 'node:stream';
import pg from 'pg';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { BaseDatabaseAdapter } from './base.adapter';
import type { RawQueryResult } from './types';

// Disable pg's automatic type conversions for temporal and precision-sensitive types.
const RAW = (val: string) => val;
const TEMPORAL_OIDS = [
  1082, 1083, 1114, 1184, 1266, 1182, 1183, 1115, 1185, 1270,
] as const;
const PRECISION_OIDS = [1700, 1231, 20, 1016] as const;
[...TEMPORAL_OIDS, ...PRECISION_OIDS].forEach(oid =>
  pg.types.setTypeParser(
    oid as Parameters<typeof pg.types.setTypeParser>[0],
    RAW
  )
);

export class PostgresAdapter extends BaseDatabaseAdapter {
  constructor(
    connection: string | Knex.Config['connection'],
    applicationName: string = 'OrcaQ'
  ) {
    let connectionConfig: string | Knex.Config['connection'] = connection;

    if (typeof connectionConfig === 'string') {
      const url = new URL(connectionConfig);
      url.searchParams.set('application_name', applicationName);
      connectionConfig = url.toString();
    } else if (
      typeof connectionConfig === 'object' &&
      connectionConfig !== null
    ) {
      connectionConfig = {
        ...(connectionConfig as object),
        application_name: applicationName,
      };
    }

    const knexInstance = knex({
      client: DatabaseClientType.POSTGRES,
      connection: connectionConfig,
      pool: {
        min: 1,
        max: 10,
        idleTimeoutMillis: 5 * 60 * 1000,
      },
      useNullAsDefault: true,
      log: {
        warn(message) {
          console.warn('[PostgresAdapter]', message);
        },
        error(message) {
          console.error('[PostgresAdapter]', message);
        },
        deprecate(message) {
          console.warn('[PostgresAdapter] Deprecation:', message);
        },
        debug(message) {
          console.debug('[PostgresAdapter]', message);
        },
      },
    });

    super(DatabaseClientType.POSTGRES, connection, knexInstance);
  }

  protected async _rawQuery<T = any>(
    sql: string,
    bindings: any[]
  ): Promise<T[]> {
    const result = await this.knex.raw(sql, bindings);
    return result.rows || [];
  }

  protected async _rawOut<T = any>(
    sql: string,
    bindings: any[]
  ): Promise<RawQueryResult<T>> {
    const result = await this.knex
      .raw(sql, bindings)
      .options({ rowMode: 'array' });
    return {
      rows: result.rows || [],
      fields: result.fields || [],
      rowCount: result.rowCount || 0,
      command: result.command || '',
    };
  }

  protected _streamQuery(
    sql: string,
    bindings: any[],
    options: Record<string, any>
  ): Readable {
    // Knex's .stream() method returns a readable stream.
    // For pg, we can pass options which are passed to pg-query-stream.
    return this.knex.raw(sql, bindings).stream(options) as unknown as Readable;
  }

  protected _getNativeSql(
    sql: string,
    bindings: Knex.RawBinding
  ): Knex.SqlNative {
    return this.knex.raw(sql, bindings).toSQL().toNative();
  }
}
