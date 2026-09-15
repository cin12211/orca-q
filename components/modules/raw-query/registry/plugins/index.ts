import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { RawQueryDialectPlugin } from '../rawQueryPlugin.types';
import { mongoPlugin } from './mongo.plugin';
import { postgresPlugin } from './postgres.plugin';
import { redisPlugin } from './redis.plugin';
import { sqlitePlugin } from './sqlite.plugin';

export * from './postgres.plugin';
export * from './mongo.plugin';
export * from './redis.plugin';
export * from './sqlite.plugin';

export function getRawQueryPlugin(
  databaseType?: DatabaseClientType
): RawQueryDialectPlugin<any> {
  switch (databaseType) {
    case DatabaseClientType.MONGODB:
      return mongoPlugin;
    case DatabaseClientType.REDIS:
      return redisPlugin;
    case DatabaseClientType.SQLITE3:
    case DatabaseClientType.BETTER_SQLITE3:
      return sqlitePlugin;
    default:
      return postgresPlugin;
  }
}
