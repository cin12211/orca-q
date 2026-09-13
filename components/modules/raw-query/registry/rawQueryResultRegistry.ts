import { DatabaseClientType } from '~/core/constants/database-client-type';
import {
  createStandardSqlProfile,
  mongoProfile,
  postgresProfile,
  redisProfile,
} from './profiles';
import type { RawQueryResultProfile } from './rawQueryResult.types';

export const RAW_QUERY_RESULT_REGISTRY = {
  [DatabaseClientType.POSTGRES]: postgresProfile,
  [DatabaseClientType.MYSQL]: createStandardSqlProfile(),
  [DatabaseClientType.MYSQL2]: createStandardSqlProfile(),
  [DatabaseClientType.MARIADB]: createStandardSqlProfile(),
  [DatabaseClientType.REDIS]: redisProfile,
  [DatabaseClientType.MONGODB]: mongoProfile,
  [DatabaseClientType.SQLITE3]: createStandardSqlProfile(),
  [DatabaseClientType.BETTER_SQLITE3]: createStandardSqlProfile(),
  [DatabaseClientType.SNOWFLAKE]: createStandardSqlProfile(),
  [DatabaseClientType.MSSQL]: createStandardSqlProfile(),
  [DatabaseClientType.ORACLE]: createStandardSqlProfile(),
} as const satisfies Record<DatabaseClientType, RawQueryResultProfile>;

export function getRawQueryResultProfile(
  databaseType: DatabaseClientType
): RawQueryResultProfile {
  return RAW_QUERY_RESULT_REGISTRY[databaseType];
}
