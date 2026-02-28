import { MysqlAdapter } from './mysql.adapter';
import { PostgresAdapter } from './postgres.adapter';
import type { DatabaseType, IDatabaseAdapter } from './types';

type AdapterFactory = (connectionString: string) => IDatabaseAdapter;

const ADAPTER_FACTORIES: Record<DatabaseType, AdapterFactory> = {
  postgres: connectionString => new PostgresAdapter(connectionString),
  mysql: connectionString => new MysqlAdapter(connectionString),
  sqlite: () => {
    throw new Error("Database type 'sqlite' is not supported yet.");
  },
};

export function createDatabaseAdapter(
  type: DatabaseType,
  connectionString: string
): IDatabaseAdapter {
  const factory = ADAPTER_FACTORIES[type];

  if (!factory) {
    throw new Error(`Database type '${type}' is not supported yet.`);
  }

  return factory(connectionString);
}
