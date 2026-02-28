import {
  createDomainAdapter,
  type SupportedDatabaseTypeInput,
} from '../shared';
import { PostgresViewAdapter } from './postgres/postgres-view.adapter';
import type { IDatabaseViewAdapter, DatabaseViewAdapterParams } from './types';

export async function createViewAdapter(
  dbType: SupportedDatabaseTypeInput,
  params: DatabaseViewAdapterParams
): Promise<IDatabaseViewAdapter> {
  return createDomainAdapter(dbType, params, 'view', {
    postgres: PostgresViewAdapter.create,
  });
}
