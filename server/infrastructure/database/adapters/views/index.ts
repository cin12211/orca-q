import { DatabaseClientType } from '~/core/constants/database-client-type';

export { createViewAdapter } from './views.factory';

export type { IDatabaseViewAdapter, DatabaseViewAdapterParams } from './types';
export { PostgresViewAdapter } from './postgres/postgres-view.adapter';
