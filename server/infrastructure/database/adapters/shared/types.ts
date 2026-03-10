import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { ISSHConfig, ISSLConfig } from '~/components/modules/connection';

export { DatabaseClientType };

export function normalizeSupportedDatabaseType(
  dbType: DatabaseClientType
): DatabaseClientType {
  if (Object.values(DatabaseClientType).includes(dbType)) {
    return dbType;
  }
  return DatabaseClientType.POSTGRES;
}

export interface BaseDatabaseAdapterParams {
  dbConnectionString: string;
  host?: string;
  port?: string;
  username?: string;
  password?: string;
  database?: string;
  ssl?: ISSLConfig;
  ssh?: ISSHConfig;
}
