import { DatabaseClientType } from '~/core/constants/database-client-type';
import { createDomainAdapter } from '../shared';
import { MysqlInstanceInsightsAdapter } from './mysql/mysql-instance-insights.adapter';
import { OracleInstanceInsightsAdapter } from './oracle/oracle-instance-insights.adapter';
import { PostgresInstanceInsightsAdapter } from './postgres/postgres-instance-insights.adapter';
import { SqliteInstanceInsightsAdapter } from './sqlite/sqlite-instance-insights.adapter';
import type {
  IDatabaseInstanceInsightsAdapter,
  InstanceInsightsAdapterParams,
} from './types';

export async function createInstanceInsightsAdapter(
  dbType: DatabaseClientType,
  params: InstanceInsightsAdapterParams
): Promise<IDatabaseInstanceInsightsAdapter> {
  return createDomainAdapter<
    IDatabaseInstanceInsightsAdapter,
    InstanceInsightsAdapterParams
  >(dbType, params, 'instance insights', {
    postgres: PostgresInstanceInsightsAdapter.create,
    mysql: createParams => MysqlInstanceInsightsAdapter.create(createParams),
    mariadb: createParams =>
      MysqlInstanceInsightsAdapter.create(
        createParams,
        DatabaseClientType.MARIADB
      ),
    oracledb: OracleInstanceInsightsAdapter.create,
    sqlite3: SqliteInstanceInsightsAdapter.create,
  });
}
