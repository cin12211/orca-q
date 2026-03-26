import { DatabaseClientType } from '~/core/constants/database-client-type';
import { createDomainAdapter } from '../shared';
import { PostgresTableAdapter } from './postgres/postgres-table.adapter';
import type {
  IDatabaseTableAdapter,
  DatabaseTableAdapterParams,
} from './types';

export async function createTableAdapter(
  dbType: DatabaseClientType,
  params: DatabaseTableAdapterParams
): Promise<IDatabaseTableAdapter> {
  return createDomainAdapter(dbType, params, 'table', {
    postgres: PostgresTableAdapter.create,
  });
}
