import type { RendererElement, RendererNode } from 'vue';
import { Icon } from '#components';
import { EDatabaseType } from '../type';

export { EDatabaseType } from '../type';

export interface IDBSupport {
  type: EDatabaseType;
  name: string;
  icon: globalThis.VNode<
    RendererNode,
    RendererElement,
    {
      [key: string]: any;
    }
  >;
  isSupport: boolean;
}

export const databaseSupports: IDBSupport[] = [
  {
    type: EDatabaseType.Postgres,
    name: 'PostgreSQL',
    icon: h(Icon, { name: 'logos:postgresql' }),
    isSupport: true,
  },
  // {
  //   type: EDatabaseType.MYSQL,
  //   name: 'MySQL',
  //   icon: h(Icon, { name: 'logos:mysql' }),
  //   isSupport: false,
  // },
  // {
  //   type: EDatabaseType.REDIS,
  //   name: 'Redis',
  //   icon: h(Icon, { name: 'logos:redis' }),
  //   isSupport: false,
  // },
];

export const getDatabaseSupportByType = (type: EDatabaseType) => {
  return databaseSupports.find(e => e.type === type);
};

export const defaultConnectionStringPlaceholder = {
  [EDatabaseType.Postgres]:
    'postgres://postgres:postgres@localhost:5432/postgres',
  [EDatabaseType.MySQL]: 'mysql://root:root@localhost:3306/test',
  [EDatabaseType.SQLServer]: 'mssql://sa:password@localhost:1433/test',
  [EDatabaseType.Oracle]:
    'oracle://username:password@localhost:1521/service_name',
  [EDatabaseType.Mongo]: 'mongodb://localhost:27017/test',
  [EDatabaseType.Redis]: 'redis://localhost:6379',
  [EDatabaseType.SQLite]:
    'sqlite:///absolute/path/to/file.sqlite   (or: file:/path/to/file.sqlite)',
};

export const defaultConnectionPort = {
  [EDatabaseType.Postgres]: '5432',
  [EDatabaseType.MySQL]: '3306',
  [EDatabaseType.SQLServer]: '1433',
  [EDatabaseType.Oracle]: '1521',
  [EDatabaseType.Mongo]: '27017',
  [EDatabaseType.Redis]: '6379',
  [EDatabaseType.SQLite]: '',
};
