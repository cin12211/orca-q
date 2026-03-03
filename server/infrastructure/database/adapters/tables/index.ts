import { DatabaseClientType } from '~/core/constants/database-client-type';

export { createTableAdapter } from './tables.factory';

export type {
  IDatabaseTableAdapter,
  DatabaseTableAdapterParams,
} from './types';
export { PostgresTableAdapter } from './postgres/postgres-table.adapter';
