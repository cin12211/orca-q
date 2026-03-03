import { DatabaseClientType } from '~/core/constants/database-client-type';

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
}
