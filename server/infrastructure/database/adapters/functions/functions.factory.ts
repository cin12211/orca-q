import { DatabaseClientType } from '~/core/constants/database-client-type';
import { createDomainAdapter } from '../shared';
import { MysqlFunctionAdapter } from './mysql/mysql-function.adapter';
import { OracleFunctionAdapter } from './oracle/oracle-function.adapter';
import { PostgresFunctionAdapter } from './postgres/postgres-function.adapter';
import { SqliteFunctionAdapter } from './sqlite/sqlite-function.adapter';
import type {
  IDatabaseFunctionAdapter,
  DatabaseFunctionAdapterParams,
} from './types';

export async function createFunctionAdapter(
  dbType: DatabaseClientType,
  params: DatabaseFunctionAdapterParams
): Promise<IDatabaseFunctionAdapter> {
  return createDomainAdapter<
    IDatabaseFunctionAdapter,
    DatabaseFunctionAdapterParams
  >(dbType, params, 'function', {
    postgres: PostgresFunctionAdapter.create,
    mysql: createParams => MysqlFunctionAdapter.create(createParams),
    mariadb: createParams =>
      MysqlFunctionAdapter.create(createParams, DatabaseClientType.MARIADB),
    oracledb: OracleFunctionAdapter.create,
    sqlite3: SqliteFunctionAdapter.create,
  });
}
