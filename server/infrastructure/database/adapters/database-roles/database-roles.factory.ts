/**
 * Database Role Adapter Factory
 * Creates the appropriate adapter based on database type
 */
import { createError } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { createDomainAdapter } from '../shared';
import { PostgresRoleAdapter } from './postgres/postgres-role.adapter';
import type { IDatabaseRoleAdapter, DatabaseRoleAdapterParams } from './types';

/**
 * Factory function to create database role adapters
 * Extend this to add support for new database types
 */
export async function createRoleAdapter(
  dbType: DatabaseClientType,
  params: DatabaseRoleAdapterParams
): Promise<IDatabaseRoleAdapter> {
  if (dbType === DatabaseClientType.MYSQL) {
    throw createError({
      statusCode: 501,
      statusMessage: 'MySQL role adapter not yet implemented',
    });
  }

  if (dbType === DatabaseClientType.SQLITE3) {
    throw createError({
      statusCode: 501,
      statusMessage: 'SQLite role adapter not yet implemented',
    });
  }

  return createDomainAdapter(dbType, params, 'role', {
    postgres: PostgresRoleAdapter.create,
  });
}
