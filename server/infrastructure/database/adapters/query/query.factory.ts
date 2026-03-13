import { DatabaseClientType } from '~/core/constants/database-client-type';
import { createDomainAdapter } from '../shared';
import { PostgresQueryAdapter } from './postgres/postgres-query.adapter';
import type {
  IDatabaseQueryAdapter,
  DatabaseQueryAdapterParams,
} from './types';

export async function createQueryAdapter(
  dbType: DatabaseClientType,
  params: DatabaseQueryAdapterParams
): Promise<IDatabaseQueryAdapter> {
  return createDomainAdapter(dbType, params, 'query', {
    postgres: PostgresQueryAdapter.create,
  });
}
