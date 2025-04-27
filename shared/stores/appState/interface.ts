export enum EConnectionMethod {
  STRING = 'string',
  FORM = 'form',
}

export enum EDatabaseType {
  PG = `postgres`,
  MYSQL = 'mysql',
  REDIS = 'redis',
}

export interface Schema {
  connectionId: string;
  workspaceId: string;
  name: string;
  entities: string[];
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
