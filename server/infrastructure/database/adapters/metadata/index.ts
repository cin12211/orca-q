import { DatabaseClientType } from '~/core/constants/database-client-type';

export { createMetadataAdapter } from './metadata.factory';

export type {
  IDatabaseMetadataAdapter,
  DatabaseMetadataAdapterParams,
} from './types';
export { PostgresMetadataAdapter } from './postgres/postgres-metadata.adapter';
