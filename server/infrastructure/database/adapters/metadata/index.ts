export { createMetadataAdapter } from './metadata.factory';

export type {
  IDatabaseMetadataAdapter,
  DatabaseMetadataAdapterParams,
} from './types';
export { SupportedDatabaseType } from '../shared';
export type { SupportedDatabaseTypeInput } from '../shared';
export { PostgresMetadataAdapter } from './postgres/postgres-metadata.adapter';
