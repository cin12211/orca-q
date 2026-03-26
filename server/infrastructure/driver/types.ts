import { Knex } from 'knex';
import type { Readable } from 'node:stream';
import { DatabaseClientType } from '~/core/constants/database-client-type';

export interface RawQueryResult<T = object> {
  rows: T[];
  fields?: any[];
  rowCount?: number;
  command?: string;
}

export interface IDatabaseAdapter {
  readonly knex: Knex;
  readonly dbType: DatabaseClientType;
  readonly connection: string | Knex.Config['connection'];

  rawQuery<T = any>(sql: string, bindings?: any[]): Promise<T[]>;
  rawOut<T = any>(sql: string, bindings?: any[]): Promise<RawQueryResult<T>>;
  streamQuery(
    sql: string,
    bindings?: any[],
    options?: Record<string, any>
  ): AsyncIterable<any> | Readable;
  acquireRawConnection(): Promise<any>;
  releaseRawConnection(connection: any): Promise<void>;
  healthCheck(): Promise<boolean>;
  getNativeSql(sql: string, bindings: Knex.RawBinding): Knex.SqlNative;
  destroy(): Promise<void>;
}
