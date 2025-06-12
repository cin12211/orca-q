import type { RendererElement, RendererNode } from 'vue';
import { Icon } from '#components';

export enum EDatabaseType {
  PG = `postgres`,
  MYSQL = 'mysql',
  // REDIS = 'redis',
}

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
    type: EDatabaseType.PG,
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
