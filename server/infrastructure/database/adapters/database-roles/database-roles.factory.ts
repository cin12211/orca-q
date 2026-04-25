/**
 * Database Role Adapter Factory
 * Creates the appropriate adapter based on database type
 */
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { createDomainAdapter } from '../shared';
import { MysqlRoleAdapter } from './mysql/mysql-role.adapter';
import { OracleRoleAdapter } from './oracle/oracle-role.adapter';
import { PostgresRoleAdapter } from './postgres/postgres-role.adapter';
import { SqliteRoleAdapter } from './sqlite/sqlite-role.adapter';
import type { IDatabaseRoleAdapter, DatabaseRoleAdapterParams } from './types';

/**
 * Factory function to create database role adapters
 * Extend this to add support for new database types
 */
export async function createRoleAdapter(
  dbType: DatabaseClientType,
  params: DatabaseRoleAdapterParams
): Promise<IDatabaseRoleAdapter> {
  return createDomainAdapter<IDatabaseRoleAdapter, DatabaseRoleAdapterParams>(
    dbType,
    params,
    'role',
    {
      postgres: PostgresRoleAdapter.create,
      mysql: createParams => MysqlRoleAdapter.create(createParams),
      mariadb: createParams =>
        MysqlRoleAdapter.create(createParams, DatabaseClientType.MARIADB),
      oracledb: OracleRoleAdapter.create,
      sqlite3: SqliteRoleAdapter.create,
    }
  );
}
