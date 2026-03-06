import { DatabaseClientType } from '~/core/constants/database-client-type';
import { MysqlAdapter } from './mysql.adapter';
import { PostgresAdapter } from './postgres.adapter';
import type { IDatabaseAdapter } from './types';

type AdapterFactory = (connectionString: string) => IDatabaseAdapter;

const ADAPTER_FACTORIES: Partial<Record<DatabaseClientType, AdapterFactory>> = {
  [DatabaseClientType.POSTGRES]: connectionString =>
    new PostgresAdapter(connectionString),
  [DatabaseClientType.MYSQL]: connectionString =>
    new MysqlAdapter(connectionString),
  [DatabaseClientType.SQLITE3]: () => {
    throw new Error("Database type 'sqlite3' is not supported yet.");
  },
};

export function createDatabaseAdapter(
  type: DatabaseClientType,
  connectionString: string
): IDatabaseAdapter {
  const factory = ADAPTER_FACTORIES[type];

  if (!factory) {
    throw new Error(`Database type '${type}' is not supported yet.`);
  }

  return factory(connectionString);
}
