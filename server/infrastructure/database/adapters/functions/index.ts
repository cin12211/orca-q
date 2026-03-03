import { DatabaseClientType } from '~/core/constants/database-client-type';

export { createFunctionAdapter } from './functions.factory';

export type {
  IDatabaseFunctionAdapter,
  DatabaseFunctionAdapterParams,
} from './types';
export { PostgresFunctionAdapter } from './postgres/postgres-function.adapter';
