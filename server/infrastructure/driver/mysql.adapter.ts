import type { Knex } from 'knex';
import type { Readable } from 'node:stream';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { IDatabaseAdapter, RawQueryResult } from './types';

const MYSQL_PLACEHOLDER_MESSAGE =
  'MySQL adapter is a placeholder and not implemented yet.';

export class MysqlAdapter implements IDatabaseAdapter {
  readonly dbType = DatabaseClientType.MYSQL;

  constructor(public readonly connectionString: string) {}

  async rawQuery<T = any>(_sql: string, _bindings: any[] = []): Promise<T[]> {
    throw new Error(MYSQL_PLACEHOLDER_MESSAGE);
  }

  async rawOut<T = any>(
    _sql: string,
    _bindings: any[] = []
  ): Promise<RawQueryResult<T>> {
    throw new Error(MYSQL_PLACEHOLDER_MESSAGE);
  }

  streamQuery(
    _sql: string,
    _bindings: any[] = [],
    _options: Record<string, any> = {}
  ): AsyncIterable<any> | Readable {
    throw new Error(MYSQL_PLACEHOLDER_MESSAGE);
  }

  async acquireRawConnection(): Promise<any> {
    throw new Error(MYSQL_PLACEHOLDER_MESSAGE);
  }

  async releaseRawConnection(_connection: any): Promise<void> {
    throw new Error(MYSQL_PLACEHOLDER_MESSAGE);
  }

  async healthCheck(): Promise<boolean> {
    return false;
  }

  getNativeSql(sql: string, _bindings: Knex.RawBinding): Knex.SqlNative {
    throw new Error(`${MYSQL_PLACEHOLDER_MESSAGE} SQL: ${sql}`);
  }

  async destroy(): Promise<void> {
    return;
  }
}
