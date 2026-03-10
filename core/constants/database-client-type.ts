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
  MYSQL2 = 'mysql2',
  SQLITE3 = 'sqlite3',
  BETTER_SQLITE3 = 'better-sqlite3',
  MSSQL = 'mssql',
  ORACLE = 'oracledb',
}
