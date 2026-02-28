import {
  createDomainAdapter,
  type SupportedDatabaseTypeInput,
} from '../shared';
import { PostgresTableAdapter } from './postgres/postgres-table.adapter';
import type {
  IDatabaseTableAdapter,
  DatabaseTableAdapterParams,
} from './types';

export async function createTableAdapter(
  dbType: SupportedDatabaseTypeInput,
  params: DatabaseTableAdapterParams
): Promise<IDatabaseTableAdapter> {
  return createDomainAdapter(dbType, params, 'table', {
    postgres: PostgresTableAdapter.create,
  });
}
