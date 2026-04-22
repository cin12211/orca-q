/**
 * Database Role Adapter
 */
export { createRoleAdapter } from './database-roles.factory';

// Re-export types for convenience
export type { IDatabaseRoleAdapter, DatabaseRoleAdapterParams } from './types';
export { MysqlRoleAdapter } from './mysql/mysql-role.adapter';
export { OracleRoleAdapter } from './oracle/oracle-role.adapter';
export { PostgresRoleAdapter } from './postgres/postgres-role.adapter';
export { SqliteRoleAdapter } from './sqlite/sqlite-role.adapter';
