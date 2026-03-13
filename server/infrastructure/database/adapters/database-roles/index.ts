import { DatabaseClientType } from '~/core/constants/database-client-type';

/**
 * Database Role Adapter
 */
export { createRoleAdapter } from './database-roles.factory';

// Re-export types for convenience
export type { IDatabaseRoleAdapter, DatabaseRoleAdapterParams } from './types';
export { PostgresRoleAdapter } from './postgres/postgres-role.adapter';
