import { DatabaseClientType } from '~/core/constants/database-client-type';
import { baseDialect } from './dialects/base.dialect';
import { mssqlDialect } from './dialects/mssql.dialect';
import { mysqlDialect } from './dialects/mysql.dialect';
import { oracleDialect } from './dialects/oracle.dialect';
import { postgresDialect } from './dialects/postgres.dialect';
import { sqliteDialect } from './dialects/sqlite.dialect';
import type { SqlDialect } from './sql-dialect.interface';

const dialectRegistry: Partial<Record<DatabaseClientType, SqlDialect>> = {
  [DatabaseClientType.POSTGRES]: postgresDialect,
  [DatabaseClientType.MYSQL]: mysqlDialect,
  [DatabaseClientType.MYSQL2]: mysqlDialect,
  [DatabaseClientType.MARIADB]: mysqlDialect,
  [DatabaseClientType.SQLITE3]: sqliteDialect,
  [DatabaseClientType.BETTER_SQLITE3]: sqliteDialect,
  [DatabaseClientType.ORACLE]: oracleDialect,
  [DatabaseClientType.MSSQL]: mssqlDialect,
};

/**
 * Get the SQL dialect for a given database client type.
 * Falls back to `baseDialect` for unknown / unsupported types.
 */
export function getSqlDialect(dbType?: DatabaseClientType): SqlDialect {
  if (!dbType) return baseDialect;
  return dialectRegistry[dbType] ?? baseDialect;
}
