import { DatabaseClientType } from '~/core/constants/database-client-type';
import { createDomainAdapter } from '../shared';
import { MysqlViewAdapter } from './mysql/mysql-view.adapter';
import { OracleViewAdapter } from './oracle/oracle-view.adapter';
import { PostgresViewAdapter } from './postgres/postgres-view.adapter';
import { SqliteViewAdapter } from './sqlite/sqlite-view.adapter';
import type { IDatabaseViewAdapter, DatabaseViewAdapterParams } from './types';

export async function createViewAdapter(
  dbType: DatabaseClientType,
  params: DatabaseViewAdapterParams
): Promise<IDatabaseViewAdapter> {
  return createDomainAdapter<IDatabaseViewAdapter, DatabaseViewAdapterParams>(
    dbType,
    params,
    'view',
    {
      postgres: PostgresViewAdapter.create,
      mysql: createParams => MysqlViewAdapter.create(createParams),
      mariadb: createParams =>
        MysqlViewAdapter.create(createParams, DatabaseClientType.MARIADB),
      oracledb: OracleViewAdapter.create,
      sqlite3: SqliteViewAdapter.create,
    }
  );
}
