import {
  createDomainAdapter,
  type SupportedDatabaseTypeInput,
} from '../shared';
import { PostgresQueryAdapter } from './postgres/postgres-query.adapter';
import type {
  IDatabaseQueryAdapter,
  DatabaseQueryAdapterParams,
} from './types';

export async function createQueryAdapter(
  dbType: SupportedDatabaseTypeInput,
  params: DatabaseQueryAdapterParams
): Promise<IDatabaseQueryAdapter> {
  return createDomainAdapter(dbType, params, 'query', {
    postgres: PostgresQueryAdapter.create,
  });
}
