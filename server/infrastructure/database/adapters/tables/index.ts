export { createTableAdapter } from './tables.factory';

export type {
  IDatabaseTableAdapter,
  DatabaseTableAdapterParams,
} from './types';
export { SupportedDatabaseType } from '../shared';
export type { SupportedDatabaseTypeInput } from '../shared';
export { PostgresTableAdapter } from './postgres/postgres-table.adapter';
