import { DatabaseClientType } from '~/core/constants/database-client-type';

export enum EConnectionMethod {
  STRING = 'string',
  FORM = 'form',
  FILE = 'file',
  MANAGED = 'managed',
}

export enum EConnectionProviderKind {
  DIRECT_SQL = 'direct-sql',
  SQLITE_FILE = 'sqlite-file',
  CLOUDFLARE_D1 = 'cloudflare-d1',
  TURSO = 'turso',
  REDIS_DIRECT = 'redis-direct',
}

export enum EConnectionFamily {
  SQL = 'sql',
  REDIS = 'redis',
}

export enum EManagedSqliteProvider {
  CLOUDFLARE_D1 = 'cloudflare-d1',
  TURSO = 'turso',
}

export enum ESSLMode {
  DISABLE = 'disable',
  PREFERRED = 'preferred',
  REQUIRE = 'require',
  VERIFY_CA = 'verify-ca',
  VERIFY_FULL = 'verify-full',
}

export enum ESSHAuthMethod {
  PASSWORD = 'password',
  KEY = 'key',
}

export interface ISSLConfig {
  mode: ESSLMode;
  ca?: string;
  cert?: string;
  key?: string;
  rejectUnauthorized?: boolean;
}

export interface ISSHConfig {
  enabled: boolean;
  host?: string;
  port?: number;
  username?: string;
  authMethod?: ESSHAuthMethod;
  password?: string;
  privateKey?: string;
  storeInKeychain?: boolean;
  useSshKey?: boolean;
}

export interface IManagedSqliteConfig {
  provider: EManagedSqliteProvider;
  accountId?: string;
  databaseId?: string;
  databaseName?: string;
  apiToken?: string;
  url?: string;
  authToken?: string;
  branchName?: string;
}

export interface Connection {
  id: string;
  workspaceId: string;
  name: string;
  type: DatabaseClientType;
  method: EConnectionMethod;
  providerKind?: EConnectionProviderKind;
  connectionString?: string;
  host?: string;
  port?: string;
  username?: string;
  password?: string;
  database?: string;
  serviceName?: string;
  filePath?: string;
  managedSqlite?: IManagedSqliteConfig;
  ssl?: ISSLConfig;
  ssh?: ISSHConfig;
  tagIds?: string[];
  createdAt: string;
  updatedAt?: string;
}
