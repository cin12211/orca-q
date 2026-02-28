import {
  createDomainAdapter,
  type SupportedDatabaseTypeInput,
} from '../shared';
import { PostgresMetadataAdapter } from './postgres/postgres-metadata.adapter';
import type {
  IDatabaseMetadataAdapter,
  DatabaseMetadataAdapterParams,
} from './types';

export async function createMetadataAdapter(
  dbType: SupportedDatabaseTypeInput,
  params: DatabaseMetadataAdapterParams
): Promise<IDatabaseMetadataAdapter> {
  return createDomainAdapter(dbType, params, 'metadata', {
    postgres: PostgresMetadataAdapter.create,
  });
}
