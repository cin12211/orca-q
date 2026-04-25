import type { Knex } from 'knex';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { MysqlAdapter } from './mysql.adapter';
import { OracleAdapter } from './oracle.adapter';
import { PostgresAdapter } from './postgres.adapter';
import { SqliteAdapter } from './sqlite.adapter';
import type { IDatabaseAdapter } from './types';

type AdapterFactory = (
  connection: string | Knex.Config['connection']
) => IDatabaseAdapter;

const ADAPTER_FACTORIES: Partial<Record<DatabaseClientType, AdapterFactory>> = {
  [DatabaseClientType.POSTGRES]: connection => new PostgresAdapter(connection),
  [DatabaseClientType.MYSQL]: connection => new MysqlAdapter(connection),
  [DatabaseClientType.MARIADB]: connection =>
    new MysqlAdapter(connection, DatabaseClientType.MARIADB),
  [DatabaseClientType.ORACLE]: connection => new OracleAdapter(connection),
  [DatabaseClientType.SQLITE3]: connection => new SqliteAdapter(connection),
};

export function createDatabaseAdapter(
  type: DatabaseClientType,
  connection: string | Knex.Config['connection']
): IDatabaseAdapter {
  const factory = ADAPTER_FACTORIES[type];

  if (!factory) {
    throw new Error(`Database type '${type}' is not supported yet.`);
  }

  return factory(connection);
}
