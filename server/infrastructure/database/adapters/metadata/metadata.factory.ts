import { DatabaseClientType } from '~/core/constants/database-client-type';
import { createDomainAdapter } from '../shared';
import { PostgresMetadataAdapter } from './postgres/postgres-metadata.adapter';
import type {
  IDatabaseMetadataAdapter,
  DatabaseMetadataAdapterParams,
} from './types';

export async function createMetadataAdapter(
  dbType: DatabaseClientType,
  params: DatabaseMetadataAdapterParams
): Promise<IDatabaseMetadataAdapter> {
  return createDomainAdapter(dbType, params, 'metadata', {
    postgres: PostgresMetadataAdapter.create,
  });
}
