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
    isSupport: false,
  },
];

export const DEFAULT_DB_PORTS: Record<string, string> = {
  [DatabaseClientType.POSTGRES]: '5432',
  [DatabaseClientType.MYSQL]: '3306',
  [DatabaseClientType.MYSQL2]: '3306',
};

export const getDatabaseSupportByType = (type: DatabaseClientType) => {
  return databaseSupports.find(e => e.type === type);
};
