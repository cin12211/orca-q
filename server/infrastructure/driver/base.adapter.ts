import type { Knex } from 'knex';
import type { Readable } from 'node:stream';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { IDatabaseAdapter, RawQueryResult } from './types';

export abstract class BaseDatabaseAdapter implements IDatabaseAdapter {
  protected knex: Knex;
  public readonly dbType: DatabaseClientType;
  public readonly connection: string | Knex.Config['connection'];

  constructor(
    dbType: DatabaseClientType,
    connection: string | Knex.Config['connection'],
    knexInstance: Knex
  ) {
    this.dbType = dbType;
    this.connection = connection;
    this.knex = knexInstance;
  }

  async rawQuery<T = any>(sql: string, bindings: any[] = []): Promise<T[]> {
    return this._rawQuery(sql, bindings);
  }

  async rawOut<T = any>(
    sql: string,
    bindings: any[] = []
  ): Promise<RawQueryResult<T>> {
    return this._rawOut(sql, bindings);
  }

  streamQuery(
    sql: string,
    bindings: any[] = [],
    options: Record<string, any> = {}
  ): Readable {
    return this._streamQuery(sql, bindings, options);
  }

  public async acquireRawConnection(): Promise<any> {
    return this.knex.client.acquireConnection();
  }

  public async releaseRawConnection(connection: any): Promise<void> {
    await this.knex.client.releaseConnection(connection);
  }

  public getNativeSql(sql: string, bindings: Knex.RawBinding) {
    return this._getNativeSql(sql, bindings);
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.knex.raw('SELECT 1');
      return true;
    } catch (e) {
      console.error(
        `[BaseDatabaseAdapter] Health check failed for ${this.dbType}`,
        e
      );
      return false;
    }
  }

  async destroy(): Promise<void> {
    await this.knex.destroy();
  }

  // Abstract methods to be implemented by specific adapters to handle driver-specific response formats
  protected abstract _rawQuery<T = any>(
    sql: string,
    bindings: any[]
  ): Promise<T[]>;
  protected abstract _rawOut<T = any>(
    sql: string,
    bindings: any[]
  ): Promise<RawQueryResult<T>>;
  protected abstract _streamQuery(
    sql: string,
    bindings: any[],
    options: Record<string, any>
  ): Readable;

  protected abstract _getNativeSql(
    sql: string,
    bindings: Knex.RawBinding
  ): Knex.SqlNative;
}
