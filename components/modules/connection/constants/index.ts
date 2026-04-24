import type { RendererElement, RendererNode } from 'vue';
import { Icon } from '#components';
import { DatabaseClientType } from '~/core/constants/database-client-type';

export interface IDBSupport {
  type: DatabaseClientType;
  name: string;
  icon: globalThis.VNode<
    RendererNode,
    RendererElement,
    {
      [key: string]: any;
    }
  >;
  isSupport: boolean;
  isBeta?: boolean;
  unsupportedLabel?: string;
}

export const databaseSupports: IDBSupport[] = [
  {
    type: DatabaseClientType.POSTGRES,
    name: 'PostgreSQL',
    icon: h(Icon, { name: 'logos:postgresql' }),
    isSupport: true,
  },
  {
    type: DatabaseClientType.MYSQL,
    name: 'MySQL',
    icon: h(Icon, { name: 'logos:mysql' }),
    isSupport: true,
    isBeta: true,
  },
  {
    type: DatabaseClientType.MARIADB,
    name: 'MariaDB',
    icon: h(Icon, { name: 'logos:mariadb-icon' }),
    isSupport: true,
    isBeta: true,
  },
  {
    type: DatabaseClientType.ORACLE,
    name: 'Oracle',
    icon: h(Icon, { name: 'simple-icons:oracle', class: 'text-red-500' }),
    isSupport: true,
    isBeta: true,
  },
  {
    type: DatabaseClientType.SQLITE3,
    name: 'SQLite',
    icon: h(Icon, { name: 'file-icons:sqlite' }),
    isSupport: true,
    isBeta: true,
  },
  {
    type: DatabaseClientType.MONGODB,
    name: 'MongoDB',
    icon: h(Icon, { name: 'logos:mongodb-icon' }),
    isSupport: false,
    unsupportedLabel: 'Coming soon',
  },
  {
    type: DatabaseClientType.REDIS,
    name: 'Redis',
    icon: h(Icon, { name: 'logos:redis' }),
    isSupport: false,
    unsupportedLabel: 'Coming soon',
  },
  {
    type: DatabaseClientType.MSSQL,
    name: 'SQL Server',
    icon: h(Icon, { name: 'simple-icons:microsoftsqlserver' }),
    isSupport: false,
    unsupportedLabel: 'Coming soon',
  },
  {
    type: DatabaseClientType.SNOWFLAKE,
    name: 'Snowflake',
    icon: h(Icon, { name: 'simple-icons:snowflake' }),
    isSupport: false,
    unsupportedLabel: 'Coming soon',
  },
];

export const DEFAULT_DB_PORTS: Record<string, string> = {
  [DatabaseClientType.POSTGRES]: '5432',
  [DatabaseClientType.MYSQL]: '3306',
  [DatabaseClientType.MARIADB]: '3306',
  [DatabaseClientType.MYSQL2]: '3306',
  [DatabaseClientType.MONGODB]: '27017',
  [DatabaseClientType.REDIS]: '6379',
  [DatabaseClientType.MSSQL]: '1433',
  [DatabaseClientType.ORACLE]: '1521',
  [DatabaseClientType.BETTER_SQLITE3]: '0',
  [DatabaseClientType.SQLITE3]: '0',
  [DatabaseClientType.SNOWFLAKE]: '443',
};

export const getDatabaseSupportByType = (type: DatabaseClientType) => {
  return databaseSupports.find(e => e.type === type);
};

export const isSqlite3ConnectionsEnabled = (value: unknown) => {
  return value !== false && value !== 'false' && value !== '0';
};

export const isSqliteConnectionDisabled = (
  connection: { type: DatabaseClientType | string },
  sqlite3ConnectionsEnabled: boolean
) => {
  return (
    connection.type === DatabaseClientType.SQLITE3 && !sqlite3ConnectionsEnabled
  );
};
