/**
 * Database Role Adapter Factory
 * Creates the appropriate adapter based on database type
 */
import { PostgresRoleAdapter } from './postgres.adapter';
import type { IDatabaseRoleAdapter, DatabaseRoleAdapterParams } from './types';

export type SupportedDatabaseType = 'postgres' | 'mysql' | 'sqlite';

/**
 * Factory function to create database role adapters
 * Extend this to add support for new database types
 */
export async function createRoleAdapter(
  dbType: SupportedDatabaseType,
  params: DatabaseRoleAdapterParams
): Promise<IDatabaseRoleAdapter> {
  switch (dbType) {
    case 'postgres':
      return PostgresRoleAdapter.create(params);

    case 'mysql':
      // Future: return MySQLRoleAdapter.create(params);
      throw createError({
        statusCode: 501,
        statusMessage: 'MySQL role adapter not yet implemented',
      });

    case 'sqlite':
      // Future: return SQLiteRoleAdapter.create(params);
      throw createError({
        statusCode: 501,
        statusMessage: 'SQLite role adapter not yet implemented',
      });

    default:
      throw createError({
        statusCode: 400,
        statusMessage: `Unsupported database type: ${dbType}`,
      });
  }
}

// Re-export types for convenience
export type { IDatabaseRoleAdapter, DatabaseRoleAdapterParams } from './types';
export { PostgresRoleAdapter } from './postgres.adapter';
