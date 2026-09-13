import { DatabaseClientType } from '~/core/constants/database-client-type';
import {
  createStandardSqlRawQueryProfile,
  mongoRawQueryProfile,
  postgresRawQueryProfile,
  redisRawQueryProfile,
} from './profiles';
import type { RawQueryProfile } from './rawQueryProfile.types';

export const RAW_QUERY_REGISTRY: Record<DatabaseClientType, RawQueryProfile> = {
  [DatabaseClientType.POSTGRES]: postgresRawQueryProfile,
  [DatabaseClientType.MYSQL]: createStandardSqlRawQueryProfile(
    DatabaseClientType.MYSQL
  ),
  [DatabaseClientType.MYSQL2]: createStandardSqlRawQueryProfile(
    DatabaseClientType.MYSQL2
  ),
  [DatabaseClientType.MARIADB]: createStandardSqlRawQueryProfile(
    DatabaseClientType.MARIADB
  ),
  [DatabaseClientType.REDIS]: redisRawQueryProfile,
  [DatabaseClientType.MONGODB]: mongoRawQueryProfile,
  [DatabaseClientType.SQLITE3]: createStandardSqlRawQueryProfile(
    DatabaseClientType.SQLITE3
  ),
  [DatabaseClientType.BETTER_SQLITE3]: createStandardSqlRawQueryProfile(
    DatabaseClientType.BETTER_SQLITE3
  ),
  [DatabaseClientType.SNOWFLAKE]: createStandardSqlRawQueryProfile(
    DatabaseClientType.SNOWFLAKE
  ),
  [DatabaseClientType.MSSQL]: createStandardSqlRawQueryProfile(
    DatabaseClientType.MSSQL
  ),
  [DatabaseClientType.ORACLE]: createStandardSqlRawQueryProfile(
    DatabaseClientType.ORACLE
  ),
};

export function getRawQueryProfile(
  databaseType?: DatabaseClientType
): RawQueryProfile {
  if (!databaseType) {
    return RAW_QUERY_REGISTRY[DatabaseClientType.MYSQL];
  }
  return (
    RAW_QUERY_REGISTRY[databaseType] ??
    RAW_QUERY_REGISTRY[DatabaseClientType.MYSQL]
  );
}
