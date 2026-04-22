import knex, { type Knex } from 'knex';
import type { Readable } from 'node:stream';
import * as oracledb from 'oracledb';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { DatabaseField } from '~/core/types';
import { BaseDatabaseAdapter } from './base.adapter';
import type { RawQueryResult } from './types';

const DEFAULT_ORACLE_PORT = 1521;

interface OracleMetadata {
  name?: string;
  dbType?: number;
  fetchType?: number;
  byteSize?: number;
}

function buildOracleConnectString(
  host: string,
  port: number,
  serviceName: string
) {
  return `${host}:${port}/${serviceName}`;
}

function normalizeOracleConnection(
  connection: string | Knex.Config['connection']
): Knex.Config['connection'] {
  if (typeof connection === 'string') {
    const url = new URL(connection);
    const serviceName = decodeURIComponent(url.pathname.replace(/^\/+/, ''));

    return {
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      connectString: buildOracleConnectString(
        url.hostname,
        Number(url.port) || DEFAULT_ORACLE_PORT,
        serviceName
      ),
    };
  }

  const candidate = (connection || {}) as Record<string, any>;
  const host = candidate.host || '127.0.0.1';
  const port = Number(candidate.port) || DEFAULT_ORACLE_PORT;
  const serviceName = candidate.serviceName || candidate.database;

  if (!serviceName && !candidate.connectString) {
    throw new Error(
      'Oracle connections require a service name or connectString.'
    );
  }

  return {
    user: candidate.user ?? candidate.username,
    password: candidate.password,
    connectString:
      candidate.connectString ||
      buildOracleConnectString(host, port, serviceName),
    ...(candidate.ssl ? { ssl: candidate.ssl } : {}),
  };
}

export function normalizeOracleFields(
  fields: OracleMetadata[] = []
): DatabaseField[] {
  return fields.map((field, index) => ({
    name: field.name || `column_${index + 1}`,
    tableID: 0,
    columnID: index,
    dataTypeID: field.dbType ?? field.fetchType ?? 0,
    dataTypeSize: field.byteSize ?? 0,
    dataTypeModifier: 0,
    format: 'text',
  }));
}

function inferOracleCommand(sql: string) {
  return sql.trim().split(/\s+/, 1)[0]?.toUpperCase() || '';
}

export class OracleAdapter extends BaseDatabaseAdapter {
  constructor(connection: string | Knex.Config['connection']) {
    const normalizedConnection = normalizeOracleConnection(connection);
    const knexInstance = knex({
      client: DatabaseClientType.ORACLE,
      connection: normalizedConnection,
      pool: {
        min: 1,
        max: 10,
        idleTimeoutMillis: 5 * 60 * 1000,
      },
      log: {
        warn(message) {
          console.warn('[OracleAdapter]', message);
        },
        error(message) {
          console.error('[OracleAdapter]', message);
        },
        deprecate(message) {
          console.warn('[OracleAdapter] Deprecation:', message);
        },
        debug(message) {
          console.debug('[OracleAdapter]', message);
        },
      },
    });

    super(DatabaseClientType.ORACLE, normalizedConnection, knexInstance);
  }

  private async execute<T = unknown>(
    sql: string,
    bindings: any = [],
    outFormat: number = oracledb.OUT_FORMAT_OBJECT
  ) {
    const connection = await this.acquireRawConnection();

    try {
      return await connection.execute(sql, bindings, {
        outFormat,
      });
    } finally {
      await this.releaseRawConnection(connection);
    }
  }

  override async healthCheck(): Promise<boolean> {
    try {
      await this.knex.raw('SELECT 1 FROM DUAL');
      return true;
    } catch (error) {
      console.error('[OracleAdapter] Health check failed', error);
      return false;
    }
  }

  protected async _rawQuery<T = any>(
    sql: string,
    bindings: any = []
  ): Promise<T[]> {
    const result = await this.execute<T>(
      sql,
      bindings,
      oracledb.OUT_FORMAT_OBJECT
    );

    return (result.rows || []) as T[];
  }

  protected async _rawOut<T = any>(
    sql: string,
    bindings: any = []
  ): Promise<RawQueryResult<T>> {
    const result = await this.execute<T>(
      sql,
      bindings,
      oracledb.OUT_FORMAT_ARRAY
    );

    return {
      rows: ((result.rows || []) as T[]) || [],
      fields: normalizeOracleFields(result.metaData as OracleMetadata[]),
      rowCount: result.rowsAffected ?? result.rows?.length ?? 0,
      command: inferOracleCommand(sql),
    };
  }

  protected _streamQuery(
    sql: string,
    bindings: any = [],
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
