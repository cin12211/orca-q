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
  MONGODB = 'mongodb',
  SQLITE3 = 'sqlite3',
  SNOWFLAKE = 'snowflake',
  BETTER_SQLITE3 = 'better-sqlite3',
  MSSQL = 'mssql',
  ORACLE = 'oracledb',
  COCKROACHDB = 'cockroachdb',
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
  DatabaseClientType.COCKROACHDB,
] as const;

/**
 * Client types that speak the PostgreSQL wire protocol and SQL dialect closely
 * enough to share Postgres code paths (quoting, `$n` placeholders, ILIKE,
 * RETURNING, NULLS FIRST/LAST, pg result shapes).
 */
export const POSTGRES_COMPATIBLE_CLIENT_TYPES = [
  DatabaseClientType.POSTGRES,
  DatabaseClientType.COCKROACHDB,
] as const;

export function isPostgresCompatibleClientType(
  type?: DatabaseClientType | string | null
): boolean {
  return (POSTGRES_COMPATIBLE_CLIENT_TYPES as readonly string[]).includes(
    type ?? ''
  );
}

/**
 * SQL client types whose Database Tools panel only offers Instance Insights.
 * Backup/restore and schema diff are not implemented for them yet.
 */
export const INSIGHTS_ONLY_DATABASE_TOOLS_CLIENT_TYPES = [
  DatabaseClientType.MSSQL,
  DatabaseClientType.COCKROACHDB,
] as const;

export function isInsightsOnlyDatabaseToolsClientType(
  type?: DatabaseClientType | string | null
): boolean {
  return (
    INSIGHTS_ONLY_DATABASE_TOOLS_CLIENT_TYPES as readonly string[]
  ).includes(type ?? '');
}

export const NOSQL_DATABASE_CLIENT_TYPES = [
  DatabaseClientType.REDIS,
  DatabaseClientType.MONGODB,
] as const;
