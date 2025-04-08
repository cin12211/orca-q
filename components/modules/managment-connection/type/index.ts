import type { RendererElement, RendererNode } from "vue";

export enum EDatabaseType {
  PG = "postgresql",
  MYSQL = "mysql",
  REDIS = "redis",
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

export enum EConnectionMethod {
  STRING = "string",
  FORM = "form",
}

export interface DatabaseConnection {
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
