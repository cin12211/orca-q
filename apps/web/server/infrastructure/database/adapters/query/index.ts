import { DatabaseClientType } from '~~/app/core/constants/database-client-type';

export { createQueryAdapter } from './query.factory';

export type {
  IDatabaseQueryAdapter,
  DatabaseQueryAdapterParams,
} from './types';
export { PostgresQueryAdapter } from './postgres/postgres-query.adapter';
export { MysqlQueryAdapter } from './mysql/mysql-query.adapter';
export { OracleQueryAdapter } from './oracle/oracle-query.adapter';
export { SqliteQueryAdapter } from './sqlite/sqlite-query.adapter';
export { DuckDbQueryAdapter } from './duckdb/duckdb-query.adapter';
