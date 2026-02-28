import {
  createDomainAdapter,
  type SupportedDatabaseTypeInput,
} from '../shared';
import { PostgresInstanceInsightsAdapter } from './postgres/postgres-instance-insights.adapter';
import type {
  IDatabaseInstanceInsightsAdapter,
  InstanceInsightsAdapterParams,
} from './types';

export async function createInstanceInsightsAdapter(
  dbType: SupportedDatabaseTypeInput,
  params: InstanceInsightsAdapterParams
): Promise<IDatabaseInstanceInsightsAdapter> {
  return createDomainAdapter(dbType, params, 'instance insights', {
    postgres: PostgresInstanceInsightsAdapter.create,
  });
}
