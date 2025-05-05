import type { EDatabaseType } from '~/components/modules/management-connection/constants';
import type { EConnectionMethod } from '~/components/modules/management-connection/type';

interface Column {
  label: string;
  type: 'field';
  info: string;
}

export interface TableDetails {
  [tableName: string]: Column[];
}

export interface Schema {
  connectionId: string;
  workspaceId: string;
  name: string;
  tableDetails?: TableDetails | null;
  tables: string[];
  views: string[];
  functions: string[];
}

export interface Connection {
  workspaceId: string;
  id: string;
  name: string;
  type: EDatabaseType;
  method: EConnectionMethod;
  connectionString?: string;
  host?: string;
  port?: string;
  username?: string;
  password?: string;
  database?: string;
  createdAt: Date;
}

export interface Workspace {
  id: string;
  icon: string;
  name: string;
  desc?: string;
  lastOpened?: string;
  createdAt: string;
}
