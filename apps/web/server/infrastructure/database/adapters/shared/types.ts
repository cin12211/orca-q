import type { ISSHConfig, ISSLConfig } from '~~/app/components/modules/connection';
import { DatabaseClientType } from '~~/app/core/constants/database-client-type';
import type {
  EConnectionProviderKind,
  IManagedSqliteConfig,
} from '~~/app/core/types/entities/connection.entity';

export { DatabaseClientType };

const DB_TYPE_ALIASES: Partial<Record<DatabaseClientType, DatabaseClientType>> =
  {
    [DatabaseClientType.MYSQL2]: DatabaseClientType.MYSQL,
  };

export function normalizeSupportedDatabaseType(
  dbType: DatabaseClientType
): DatabaseClientType {
  return DB_TYPE_ALIASES[dbType] ?? dbType;
}

export interface BaseDatabaseAdapterParams {
  dbConnectionString?: string;
  host?: string;
  port?: string;
  username?: string;
  password?: string;
  database?: string;
  serviceName?: string;
  filePath?: string;
  providerKind?: EConnectionProviderKind;
  managedSqlite?: IManagedSqliteConfig;
  ssl?: ISSLConfig;
  ssh?: ISSHConfig;
}
