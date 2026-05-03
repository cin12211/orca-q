/**
 * Knex/driver client identifiers — the string that Knex uses in `client:`.
 *
 * This is the single source of truth for DB driver client strings across the
 * entire application (server adapters AND client-side components).
 *
 * Use `DatabaseClientType` (server/infrastructure) when you need the
 * canonical domain type (e.g. 'postgres'). Use this enum when you need to
 * instantiate or identify a Knex / driver client (e.g. 'postgres').
 */
export enum DatabaseClientType {
  POSTGRES = 'postgres',
  MYSQL = 'mysql',
  MARIADB = 'mariadb',
  MYSQL2 = 'mysql2',
  REDIS = 'redis',
  SQLITE3 = 'sqlite3',
  SNOWFLAKE = 'snowflake',
  BETTER_SQLITE3 = 'better-sqlite3',
  MSSQL = 'mssql',
  ORACLE = 'oracledb',
}

export const SQL_DATABASE_CLIENT_TYPES = [
  DatabaseClientType.POSTGRES,
  DatabaseClientType.MYSQL,
  DatabaseClientType.MARIADB,
  DatabaseClientType.MYSQL2,
  DatabaseClientType.SQLITE3,
  DatabaseClientType.BETTER_SQLITE3,
  DatabaseClientType.MSSQL,
  DatabaseClientType.ORACLE,
] as const;

export const NOSQL_DATABASE_CLIENT_TYPES = [DatabaseClientType.REDIS] as const;
