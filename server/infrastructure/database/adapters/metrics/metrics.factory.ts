import { DatabaseClientType } from '~/core/constants/database-client-type';
import { createDomainAdapter } from '../shared';
import { MysqlMetricsAdapter } from './mysql/mysql-metrics.adapter';
import { OracleMetricsAdapter } from './oracle/oracle-metrics.adapter';
import { PostgresMetricsAdapter } from './postgres/postgres-metrics.adapter';
import { SqliteMetricsAdapter } from './sqlite/sqlite-metrics.adapter';
import type {
  IDatabaseMetricsAdapter,
  DatabaseMetricsAdapterParams,
} from './types';

export async function createMetricsAdapter(
  dbType: DatabaseClientType,
  params: DatabaseMetricsAdapterParams
): Promise<IDatabaseMetricsAdapter> {
  return createDomainAdapter<
    IDatabaseMetricsAdapter,
    DatabaseMetricsAdapterParams
  >(dbType, params, 'metrics', {
    postgres: PostgresMetricsAdapter.create,
    mysql: createParams => MysqlMetricsAdapter.create(createParams),
    mariadb: createParams =>
      MysqlMetricsAdapter.create(createParams, DatabaseClientType.MARIADB),
    oracledb: OracleMetricsAdapter.create,
    sqlite3: SqliteMetricsAdapter.create,
  });
}
