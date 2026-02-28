export { createFunctionAdapter } from './functions.factory';

export type {
  IDatabaseFunctionAdapter,
  DatabaseFunctionAdapterParams,
} from './types';
export { SupportedDatabaseType } from '../shared';
export type { SupportedDatabaseTypeInput } from '../shared';
export { PostgresFunctionAdapter } from './postgres/postgres-function.adapter';
