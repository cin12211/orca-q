import { DatabaseClientType } from '~/core/constants/database-client-type';
import { createDomainAdapter } from '../shared';
import { MysqlQueryAdapter } from './mysql/mysql-query.adapter';
import { OracleQueryAdapter } from './oracle/oracle-query.adapter';
import { PostgresQueryAdapter } from './postgres/postgres-query.adapter';
import { SqliteQueryAdapter } from './sqlite/sqlite-query.adapter';
import type {
  IDatabaseQueryAdapter,
  DatabaseQueryAdapterParams,
} from './types';

export async function createQueryAdapter(
  dbType: DatabaseClientType,
  params: DatabaseQueryAdapterParams
): Promise<IDatabaseQueryAdapter> {
  return createDomainAdapter<IDatabaseQueryAdapter, DatabaseQueryAdapterParams>(
    dbType,
    params,
    'query',
    {
      postgres: PostgresQueryAdapter.create,
      mysql: params =>
        MysqlQueryAdapter.create(params, DatabaseClientType.MYSQL),
      mariadb: params =>
        MysqlQueryAdapter.create(params, DatabaseClientType.MARIADB),
      oracledb: OracleQueryAdapter.create,
      sqlite3: SqliteQueryAdapter.create,
    }
  );
}
