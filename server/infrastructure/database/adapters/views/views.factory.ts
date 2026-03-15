import { DatabaseClientType } from '~/core/constants/database-client-type';
import { createDomainAdapter } from '../shared';
import { PostgresViewAdapter } from './postgres/postgres-view.adapter';
import type { IDatabaseViewAdapter, DatabaseViewAdapterParams } from './types';

export async function createViewAdapter(
  dbType: DatabaseClientType,
  params: DatabaseViewAdapterParams
): Promise<IDatabaseViewAdapter> {
  return createDomainAdapter(dbType, params, 'view', {
    postgres: PostgresViewAdapter.create,
  });
}
