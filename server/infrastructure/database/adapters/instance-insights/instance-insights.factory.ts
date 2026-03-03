import { DatabaseClientType } from '~/core/constants/database-client-type';
import { createDomainAdapter } from '../shared';
import { PostgresInstanceInsightsAdapter } from './postgres/postgres-instance-insights.adapter';
import type {
  IDatabaseInstanceInsightsAdapter,
  InstanceInsightsAdapterParams,
} from './types';

export async function createInstanceInsightsAdapter(
  dbType: DatabaseClientType,
  params: InstanceInsightsAdapterParams
): Promise<IDatabaseInstanceInsightsAdapter> {
  return createDomainAdapter(dbType, params, 'instance insights', {
    postgres: PostgresInstanceInsightsAdapter.create,
  });
}
