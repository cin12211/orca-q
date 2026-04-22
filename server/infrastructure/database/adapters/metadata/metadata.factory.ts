import { DatabaseClientType } from '~/core/constants/database-client-type';
import { createDomainAdapter } from '../shared';
import { MysqlMetadataAdapter } from './mysql/mysql-metadata.adapter';
import { OracleMetadataAdapter } from './oracle/oracle-metadata.adapter';
import { PostgresMetadataAdapter } from './postgres/postgres-metadata.adapter';
import { SqliteMetadataAdapter } from './sqlite/sqlite-metadata.adapter';
import type {
  IDatabaseMetadataAdapter,
  DatabaseMetadataAdapterParams,
} from './types';

export async function createMetadataAdapter(
  dbType: DatabaseClientType,
  params: DatabaseMetadataAdapterParams
): Promise<IDatabaseMetadataAdapter> {
  return createDomainAdapter<
    IDatabaseMetadataAdapter,
    DatabaseMetadataAdapterParams
  >(dbType, params, 'metadata', {
    postgres: PostgresMetadataAdapter.create,
    mysql: params =>
      MysqlMetadataAdapter.create(params, DatabaseClientType.MYSQL),
    mariadb: params =>
      MysqlMetadataAdapter.create(params, DatabaseClientType.MARIADB),
    oracledb: OracleMetadataAdapter.create,
    sqlite3: SqliteMetadataAdapter.create,
  });
}
