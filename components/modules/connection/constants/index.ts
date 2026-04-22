import type { RendererElement, RendererNode } from 'vue';
import { Icon } from '#components';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { isElectron } from '~/core/helpers/environment';

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
  unsupportedLabel?: string;
}

const isElectronRuntime = isElectron();

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
  },
  {
    type: DatabaseClientType.MARIADB,
    name: 'MariaDB',
    icon: h(Icon, { name: 'logos:mariadb-icon' }),
    isSupport: true,
  },
  {
    type: DatabaseClientType.ORACLE,
    name: 'Oracle',
    icon: h(Icon, { name: 'simple-icons:oracle', class: 'text-red-500' }),
    isSupport: true,
  },
  {
    type: DatabaseClientType.SQLITE3,
    name: 'SQLite',
    icon: h(Icon, { name: 'file-icons:sqlite' }),
    isSupport: isElectronRuntime,
    unsupportedLabel: isElectronRuntime ? undefined : 'Desktop only',
  },
];

export const DEFAULT_DB_PORTS: Record<string, string> = {
  [DatabaseClientType.POSTGRES]: '5432',
  [DatabaseClientType.MYSQL]: '3306',
  [DatabaseClientType.MARIADB]: '3306',
  [DatabaseClientType.MYSQL2]: '3306',
  [DatabaseClientType.ORACLE]: '1521',
};

export const getDatabaseSupportByType = (type: DatabaseClientType) => {
  return databaseSupports.find(e => e.type === type);
};
