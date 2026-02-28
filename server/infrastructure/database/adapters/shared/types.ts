export enum SupportedDatabaseType {
  POSTGRES = 'postgres',
  MYSQL = 'mysql',
  SQLITE = 'sqlite',
}

export type SupportedDatabaseTypeInput =
  | SupportedDatabaseType
  | 'postgres'
  | 'mysql'
  | 'sqlite';

export function normalizeSupportedDatabaseType(
  dbType: SupportedDatabaseTypeInput
): SupportedDatabaseType {
  if (dbType === SupportedDatabaseType.POSTGRES) {
    return SupportedDatabaseType.POSTGRES;
  }

  if (dbType === SupportedDatabaseType.MYSQL) {
    return SupportedDatabaseType.MYSQL;
  }

  if (dbType === SupportedDatabaseType.SQLITE) {
    return SupportedDatabaseType.SQLITE;
  }

  return SupportedDatabaseType.POSTGRES;
}

export interface BaseDatabaseAdapterParams {
  dbConnectionString: string;
}
