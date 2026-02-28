import {
  createDomainAdapter,
  type SupportedDatabaseTypeInput,
} from '../shared';
import { PostgresFunctionAdapter } from './postgres/postgres-function.adapter';
import type {
  IDatabaseFunctionAdapter,
  DatabaseFunctionAdapterParams,
} from './types';

export async function createFunctionAdapter(
  dbType: SupportedDatabaseTypeInput,
  params: DatabaseFunctionAdapterParams
): Promise<IDatabaseFunctionAdapter> {
  return createDomainAdapter(dbType, params, 'function', {
    postgres: PostgresFunctionAdapter.create,
  });
}
