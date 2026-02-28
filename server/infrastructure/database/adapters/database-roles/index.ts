/**
 * Database Role Adapter
 */
export { createRoleAdapter } from './database-roles.factory';

// Re-export types for convenience
export type { IDatabaseRoleAdapter, DatabaseRoleAdapterParams } from './types';
export { SupportedDatabaseType } from '../shared';
export type { SupportedDatabaseTypeInput } from '../shared';
export { PostgresRoleAdapter } from './postgres/postgres-role.adapter';
