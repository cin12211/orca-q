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
  MONGODB_DIRECT = 'mongodb-direct',
  RABBITMQ_DIRECT = 'rabbitmq-direct',
  KAFKA_DIRECT = 'kafka-direct',
}

export enum EConnectionFamily {
  SQL = 'sql',
  REDIS = 'redis',
  MONGODB = 'mongodb',
  RABBITMQ = 'rabbitmq',
  KAFKA = 'kafka',
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

export enum EKafkaSaslMechanism {
  NONE = 'none',
  PLAIN = 'PLAIN',
  SCRAM_SHA_256 = 'SCRAM-SHA-256',
  SCRAM_SHA_512 = 'SCRAM-SHA-512',
}

export interface IRabbitMqConfig {
  /** Virtual host selected by default in the browser. */
  vhost?: string;
}

export interface IKafkaConfig {
  /** Bootstrap servers as `host:port`. */
  brokers: string[];
  clientId?: string;
  saslMechanism?: EKafkaSaslMechanism;
}

/** Message broker specific settings (RabbitMQ / Kafka). */
export interface IBrokerConfig {
  rabbitmq?: IRabbitMqConfig;
  kafka?: IKafkaConfig;
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
  broker?: IBrokerConfig;
  ssl?: ISSLConfig;
  ssh?: ISSHConfig;
  tagIds?: string[];
  createdAt: string;
  updatedAt?: string;
}
