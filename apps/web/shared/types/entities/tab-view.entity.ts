export enum TabViewType {
  AllERD = 'AllERD',
  DetailERD = 'DetailERD',
  TableOverview = 'TableOverview',
  TableDetail = 'tableDetail',

  FunctionsOverview = 'FunctionsOverview',
  FunctionsDetail = 'FunctionsDetail',

  ViewOverview = 'ViewOverview',
  ViewDetail = 'ViewDetail',

  CodeQuery = 'CodeQuery',

  UserPermissions = 'UserPermissions',
  DatabaseTools = 'DatabaseTools',
  InstanceInsights = 'InstanceInsights',
  SchemaDiff = 'SchemaDiff',
  Connection = 'Connection',
  Explorer = 'Explorer',
  Export = 'Export',
  AgentChat = 'AgentChat',
  RedisBrowser = 'RedisBrowser',
  RedisPubSub = 'RedisPubSub',
  RedisGroupOverview = 'RedisGroupOverview',
  MongoDatabaseOverview = 'MongoDatabaseOverview',
  MongoCollectionDetail = 'MongoCollectionDetail',
  RabbitQueueList = 'RabbitQueueList',
  RabbitQueueDetail = 'RabbitQueueDetail',
  RabbitExchangeDetail = 'RabbitExchangeDetail',
  RabbitConnections = 'RabbitConnections',
  RabbitUserDetail = 'RabbitUserDetail',
  RabbitDefinitions = 'RabbitDefinitions',
  KafkaTopicList = 'KafkaTopicList',
  KafkaTopicDetail = 'KafkaTopicDetail',
  KafkaConsumerGroupList = 'KafkaConsumerGroupList',
  KafkaConsumerGroupDetail = 'KafkaConsumerGroupDetail',
  KafkaLive = 'KafkaLive',
}

export enum WorkspaceTabOpenAction {
  SqlShortcut = 'sql-shortcut',
  NewSqlFile = 'new-sql-file',
  InstanceInsights = 'instance-insights',
}

export enum WorkspaceSqlFileSource {
  Existing = 'existing',
  Starter = 'starter',
  ManualCreate = 'manual-create',
}

export interface BaseTabMetadata {
  type: TabViewType;
  treeNodeId?: string;
  openAction?: WorkspaceTabOpenAction;
  [key: string]: any;
}

export interface TableDetailMetadata extends BaseTabMetadata {
  type: TabViewType.TableDetail;
  tableName: string;
}

export interface ViewDetailMetadata extends BaseTabMetadata {
  type: TabViewType.ViewDetail;
  virtualTableId: string;
  viewName: string;
}

export interface FunctionDetailMetadata extends BaseTabMetadata {
  type: TabViewType.FunctionsDetail;
  functionId: string;
}

export interface ErdDetailMetadata extends BaseTabMetadata {
  type: TabViewType.DetailERD | TabViewType.AllERD;
  tableName?: string;
}

export interface CodeQueryMetadata extends BaseTabMetadata {
  type: TabViewType.CodeQuery;
  tableName?: string;
  queryId?: string;
  fileSource?: WorkspaceSqlFileSource;
}

export interface AgentChatMetadata extends BaseTabMetadata {
  type: TabViewType.AgentChat;
  historyId?: string;
}

export interface RedisBrowserMetadata extends BaseTabMetadata {
  type: TabViewType.RedisBrowser;
  databaseIndex?: number;
  keyPattern?: string;
  selectedKey?: string;
}

export interface RedisPubSubMetadata extends BaseTabMetadata {
  type: TabViewType.RedisPubSub;
  databaseIndex?: number;
}

export interface RedisGroupOverviewMetadata extends BaseTabMetadata {
  type: TabViewType.RedisGroupOverview;
  prefix: string;
  keyCount?: number;
  memoryUsage?: number | null;
}

export interface MongoDatabaseOverviewMetadata extends BaseTabMetadata {
  type: TabViewType.MongoDatabaseOverview;
  databaseName: string;
}

export interface MongoCollectionDetailMetadata extends BaseTabMetadata {
  type: TabViewType.MongoCollectionDetail;
  databaseName: string;
  collectionName: string;
}

export interface RabbitQueueListMetadata extends BaseTabMetadata {
  type: TabViewType.RabbitQueueList;
  vhost: string;
}

export interface RabbitQueueDetailMetadata extends BaseTabMetadata {
  type: TabViewType.RabbitQueueDetail;
  vhost: string;
  queueName: string;
}

export interface RabbitExchangeDetailMetadata extends BaseTabMetadata {
  type: TabViewType.RabbitExchangeDetail;
  vhost: string;
  exchangeName: string;
}

export interface RabbitUserDetailMetadata extends BaseTabMetadata {
  type: TabViewType.RabbitUserDetail;
  userName: string;
}

export interface RabbitDefinitionsMetadata extends BaseTabMetadata {
  type: TabViewType.RabbitDefinitions;
  mode: 'export' | 'import';
}

export interface KafkaTopicDetailMetadata extends BaseTabMetadata {
  type: TabViewType.KafkaTopicDetail;
  topicName: string;
}

export interface KafkaConsumerGroupDetailMetadata extends BaseTabMetadata {
  type: TabViewType.KafkaConsumerGroupDetail;
  groupId: string;
}

export type TabMetadata =
  | TableDetailMetadata
  | ViewDetailMetadata
  | FunctionDetailMetadata
  | ErdDetailMetadata
  | CodeQueryMetadata
  | AgentChatMetadata
  | RedisBrowserMetadata
  | RedisPubSubMetadata
  | RedisGroupOverviewMetadata
  | MongoDatabaseOverviewMetadata
  | MongoCollectionDetailMetadata
  | RabbitQueueListMetadata
  | RabbitQueueDetailMetadata
  | RabbitExchangeDetailMetadata
  | RabbitUserDetailMetadata
  | RabbitDefinitionsMetadata
  | KafkaTopicDetailMetadata
  | KafkaConsumerGroupDetailMetadata
  | BaseTabMetadata;

export type TabView = {
  workspaceId: string;
  connectionId: string;
  schemaId: string;
  id: string;
  index: number;
  name: string;
  icon: string;
  iconClass?: string;
  type: TabViewType;
  routeName: string;
  routeParams?: Record<string, string | number>;
  metadata?: TabMetadata;
};
