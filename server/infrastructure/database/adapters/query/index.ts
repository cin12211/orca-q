import { DatabaseClientType } from '~/core/constants/database-client-type';

export { createQueryAdapter } from './query.factory';

export type {
  IDatabaseQueryAdapter,
  DatabaseQueryAdapterParams,
} from './types';
export { PostgresQueryAdapter } from './postgres/postgres-query.adapter';
