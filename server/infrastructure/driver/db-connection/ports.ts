import { DatabaseClientType } from '~/core/constants/database-client-type';

const DEFAULT_PORTS: Partial<Record<DatabaseClientType, number>> = {
  [DatabaseClientType.POSTGRES]: 5432,
  [DatabaseClientType.MYSQL]: 3306,
  [DatabaseClientType.MARIADB]: 3306,
  [DatabaseClientType.MYSQL2]: 3306,
  [DatabaseClientType.REDIS]: 6379,
  [DatabaseClientType.MSSQL]: 1433,
  [DatabaseClientType.ORACLE]: 1521,
  [DatabaseClientType.SNOWFLAKE]: 443,
  [DatabaseClientType.BETTER_SQLITE3]: 0,
  [DatabaseClientType.SQLITE3]: 0,
};

export function getDefaultPort(type: DatabaseClientType) {
  return DEFAULT_PORTS[type] ?? 5432;
}

export function isMysqlClient(type: DatabaseClientType) {
  return (
    type === DatabaseClientType.MYSQL ||
    type === DatabaseClientType.MARIADB ||
    type === DatabaseClientType.MYSQL2
  );
}
