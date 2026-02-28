import {
  createDomainAdapter,
  type SupportedDatabaseTypeInput,
} from '../shared';
import { PostgresMetricsAdapter } from './postgres/postgres-metrics.adapter';
import type {
  IDatabaseMetricsAdapter,
  DatabaseMetricsAdapterParams,
} from './types';

export async function createMetricsAdapter(
  dbType: SupportedDatabaseTypeInput,
  params: DatabaseMetricsAdapterParams
): Promise<IDatabaseMetricsAdapter> {
  return createDomainAdapter(dbType, params, 'metrics', {
    postgres: PostgresMetricsAdapter.create,
  });
}
