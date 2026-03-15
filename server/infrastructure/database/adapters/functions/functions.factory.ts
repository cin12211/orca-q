import { DatabaseClientType } from '~/core/constants/database-client-type';
import { createDomainAdapter } from '../shared';
import { PostgresFunctionAdapter } from './postgres/postgres-function.adapter';
import type {
  IDatabaseFunctionAdapter,
  DatabaseFunctionAdapterParams,
} from './types';

export async function createFunctionAdapter(
  dbType: DatabaseClientType,
  params: DatabaseFunctionAdapterParams
): Promise<IDatabaseFunctionAdapter> {
  return createDomainAdapter(dbType, params, 'function', {
    postgres: PostgresFunctionAdapter.create,
  });
}
