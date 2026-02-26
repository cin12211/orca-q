import { PostgresAdapter } from './postgres.adapter';
import type { DatabaseType, IDatabaseAdapter } from './types';

export * from './types';
export * from './base.adapter';
export * from './postgres.adapter';

export function createDatabaseAdapter(
  type: DatabaseType,
  connectionString: string
): IDatabaseAdapter {
  switch (type) {
    case 'postgres':
      return new PostgresAdapter(connectionString);
    default:
      throw new Error(`Database type '${type}' is not supported yet.`);
  }
}
