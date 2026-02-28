import { Knex } from 'knex';
import type { Readable } from 'node:stream';

export type DatabaseType = 'postgres' | 'mysql' | 'sqlite';

export interface RawQueryResult<T = object> {
  rows: T[];
  fields?: any[];
  rowCount?: number;
  command?: string;
}

export interface IDatabaseAdapter {
  readonly dbType: DatabaseType;
  readonly connectionString: string;

  /**
   * Executes a raw query and returns just the rows.
   */
  rawQuery<T = any>(sql: string, bindings?: any[]): Promise<T[]>;

  /**
   * Executes a raw query and returns the full driver response.
   */
  rawOut<T = any>(sql: string, bindings?: any[]): Promise<RawQueryResult<T>>;

  /**
   * Executes a query and returns a readable stream.
   */
  streamQuery(
    sql: string,
    bindings?: any[],
    options?: Record<string, any>
  ): AsyncIterable<any> | Readable;

  /**
   * Acquires a raw driver connection (e.g. pg.PoolClient) for advanced driver-specific features.
   * MUST be released using releaseRawConnection()
   */
  acquireRawConnection(): Promise<any>;
  releaseRawConnection(connection: any): Promise<void>;

  /**
   * Performs a health check on the connection.
   */
  healthCheck(): Promise<boolean>;

  /**
   * Returns the native SQL object for the given query.
   */
  getNativeSql(sql: string, bindings: Knex.RawBinding): Knex.SqlNative;

  /**
   * Destroys the connection pool.
   */
  destroy(): Promise<void>;
}
