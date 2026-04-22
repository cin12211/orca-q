import { DatabaseClientType } from '~/core/constants/database-client-type';

export { createTableAdapter } from './tables.factory';

export type {
  IDatabaseTableAdapter,
  DatabaseTableAdapterParams,
} from './types';
export { PostgresTableAdapter } from './postgres/postgres-table.adapter';
export { MysqlTableAdapter } from './mysql/mysql-table.adapter';
export { OracleTableAdapter } from './oracle/oracle-table.adapter';
export { SqliteTableAdapter } from './sqlite/sqlite-table.adapter';
