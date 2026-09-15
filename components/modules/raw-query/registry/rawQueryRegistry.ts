import { DatabaseClientType } from '~/core/constants/database-client-type';
import {
  createStandardSqlPlugin,
  getRawQueryPlugin,
  mongoPlugin,
  postgresPlugin,
  redisPlugin,
  sqlitePlugin,
} from './plugins';
import type {
  RawQueryPlugin,
  RawQueryResultProfile,
} from './rawQueryPlugin.types';

export const RAW_QUERY_PLUGIN_REGISTRY: Record<
  DatabaseClientType,
  RawQueryPlugin
> = {
  [DatabaseClientType.POSTGRES]: postgresPlugin,
  [DatabaseClientType.MYSQL]: createStandardSqlPlugin(DatabaseClientType.MYSQL),
  [DatabaseClientType.MYSQL2]: createStandardSqlPlugin(
    DatabaseClientType.MYSQL2
  ),
  [DatabaseClientType.MARIADB]: createStandardSqlPlugin(
    DatabaseClientType.MARIADB
  ),
  [DatabaseClientType.REDIS]: redisPlugin,
  [DatabaseClientType.MONGODB]: mongoPlugin,
  [DatabaseClientType.SQLITE3]: sqlitePlugin,
  [DatabaseClientType.BETTER_SQLITE3]: sqlitePlugin,
  [DatabaseClientType.SNOWFLAKE]: createStandardSqlPlugin(
    DatabaseClientType.SNOWFLAKE
  ),
  [DatabaseClientType.MSSQL]: createStandardSqlPlugin(DatabaseClientType.MSSQL),
  [DatabaseClientType.ORACLE]: createStandardSqlPlugin(
    DatabaseClientType.ORACLE
  ),
};

// Backward-compatible registry alias
export const RAW_QUERY_REGISTRY = RAW_QUERY_PLUGIN_REGISTRY;

export { getRawQueryPlugin };
export const getRawQueryProfile = getRawQueryPlugin;

export function getRawQueryResultProfile(
  databaseType?: DatabaseClientType
): RawQueryResultProfile {
  return getRawQueryPlugin(databaseType).result!;
}

export const getRawQueryResultConfig = getRawQueryResultProfile;
