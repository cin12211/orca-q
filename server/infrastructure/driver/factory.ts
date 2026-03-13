import type { Knex } from 'knex';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { MysqlAdapter } from './mysql.adapter';
import { PostgresAdapter } from './postgres.adapter';
import type { IDatabaseAdapter } from './types';

type AdapterFactory = (
  connection: string | Knex.Config['connection']
) => IDatabaseAdapter;

const ADAPTER_FACTORIES: Partial<Record<DatabaseClientType, AdapterFactory>> = {
  [DatabaseClientType.POSTGRES]: connection => new PostgresAdapter(connection),
  [DatabaseClientType.MYSQL]: connection => new MysqlAdapter(connection),
  [DatabaseClientType.SQLITE3]: () => {
    throw new Error("Database type 'sqlite3' is not supported yet.");
  },
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
