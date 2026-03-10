import { DatabaseClientType } from '~/core/constants/database-client-type';
import { createDomainAdapter } from '../shared';
import { PostgresMetricsAdapter } from './postgres/postgres-metrics.adapter';
import type {
  IDatabaseMetricsAdapter,
  DatabaseMetricsAdapterParams,
} from './types';

export async function createMetricsAdapter(
  dbType: DatabaseClientType,
  params: DatabaseMetricsAdapterParams
): Promise<IDatabaseMetricsAdapter> {
  return createDomainAdapter(dbType, params, 'metrics', {
    postgres: PostgresMetricsAdapter.create,
  });
}
