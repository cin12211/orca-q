import type {
  EConnectionMethod,
  ISSHConfig,
  ISSLConfig,
} from '~/core/types/entities/connection.entity';

export interface RedisDatabaseOption {
  index: number;
  label: string;
  keyCount: number;
  expires: number;
  avgTtl: number | null;
}

export interface RedisKeyListItem {
  key: string;
  type: string;
  ttl: number;
  memoryUsage: number | null;
  memoryUsageHuman: string | null;
}

export type RedisPreviewKind = 'text' | 'json' | 'table' | 'readonly';

export type RedisTableKind = 'hash' | 'list' | 'set' | 'zset';

export interface RedisKeyTableColumn {
  key: string;
  label: string;
  editable?: boolean;
  type?: 'text' | 'number';
}

export interface RedisKeyTableRow {
  id: string;
  [key: string]: string | number | boolean | null;
}

export interface RedisKeyDetail extends RedisKeyListItem {
  databaseIndex: number;
  value: unknown;
  previewKind: RedisPreviewKind;
  tableKind?: RedisTableKind;
  editingSupported: boolean;
  memoryUsage: number | null;
  memoryUsageHuman: string | null;
  length: number | null;
  encoding: string | null;
  ttlLabel: string;
  stringFormat?: 'plain' | 'json';
  tableColumns?: RedisKeyTableColumn[];
  tableRows?: RedisKeyTableRow[];
}

export interface RedisBrowserResponse {
  cursor: string;
  keys: RedisKeyListItem[];
  databases: RedisDatabaseOption[];
  selectedKeyDetail: RedisKeyDetail | null;
}

export interface RedisValueUpdatePayload {
  previewKind?: RedisPreviewKind;
  stringFormat?: 'plain' | 'json';
  tableKind?: RedisTableKind;
  value: unknown;
  ttlSeconds?: number | null;
}

export interface RedisConnectionRequestBody {
  method: EConnectionMethod;
  stringConnection?: string;
  host?: string;
  port?: string;
  username?: string;
  password?: string;
  database?: string;
  databaseIndex?: number;
  ssl?: ISSLConfig;
  ssh?: ISSHConfig;
}

export interface RedisValueUpdateRequestBody
  extends RedisConnectionRequestBody {
  key: string;
  previewKind?: RedisValueUpdatePayload['previewKind'];
  stringFormat?: RedisValueUpdatePayload['stringFormat'];
  tableKind?: RedisValueUpdatePayload['tableKind'];
  ttlSeconds?: RedisValueUpdatePayload['ttlSeconds'];
  value: unknown;
}

export type RedisPubSubSubscriptionMode = 'channel' | 'pattern';

export interface RedisPubSubSubscriptionTarget {
  target: string;
  mode: RedisPubSubSubscriptionMode;
}

export interface RedisPubSubSubscriptionStatus {
  sessionId: string | null;
  target: string | null;
  mode: RedisPubSubSubscriptionMode | null;
  targets: RedisPubSubSubscriptionTarget[];
}

export interface RedisPubSubChannelMetric {
  channel: string;
  subscribers: number;
}

export interface RedisPubSubOverview {
  channels: RedisPubSubChannelMetric[];
  patterns: string[];
  patternCount: number;
  subscription: RedisPubSubSubscriptionStatus;
}

export interface RedisPubSubMessage {
  id: string;
  channel: string;
  payload: string;
  pattern: string | null;
  receivedAt: string;
}

export interface RedisPubSubMessagesResponse {
  messages: RedisPubSubMessage[];
  subscription: RedisPubSubSubscriptionStatus;
}
