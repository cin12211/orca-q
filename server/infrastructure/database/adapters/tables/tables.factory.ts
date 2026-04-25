import { DatabaseClientType } from '~/core/constants/database-client-type';
import { createDomainAdapter } from '../shared';
import { MysqlTableAdapter } from './mysql/mysql-table.adapter';
import { OracleTableAdapter } from './oracle/oracle-table.adapter';
import { PostgresTableAdapter } from './postgres/postgres-table.adapter';
import { SqliteTableAdapter } from './sqlite/sqlite-table.adapter';
import type {
  IDatabaseTableAdapter,
  DatabaseTableAdapterParams,
} from './types';

export async function createTableAdapter(
  dbType: DatabaseClientType,
  params: DatabaseTableAdapterParams
): Promise<IDatabaseTableAdapter> {
  return createDomainAdapter<IDatabaseTableAdapter, DatabaseTableAdapterParams>(
    dbType,
    params,
    'table',
    {
      postgres: PostgresTableAdapter.create,
      mysql: params =>
        MysqlTableAdapter.create(params, DatabaseClientType.MYSQL),
      mariadb: params =>
        MysqlTableAdapter.create(params, DatabaseClientType.MARIADB),
      oracledb: OracleTableAdapter.create,
      sqlite3: SqliteTableAdapter.create,
    }
  );
}
