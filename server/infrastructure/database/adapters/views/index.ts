export { createViewAdapter } from './views.factory';

export type { IDatabaseViewAdapter, DatabaseViewAdapterParams } from './types';
export { MysqlViewAdapter } from './mysql/mysql-view.adapter';
export { OracleViewAdapter } from './oracle/oracle-view.adapter';
export { PostgresViewAdapter } from './postgres/postgres-view.adapter';
export { SqliteViewAdapter } from './sqlite/sqlite-view.adapter';
