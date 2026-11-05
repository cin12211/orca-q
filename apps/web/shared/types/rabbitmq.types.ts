export interface RabbitRateSample {
  timestamp: number;
  value: number;
}

export interface RabbitMessageRates {
  publish: number | null;
  deliver: number | null;
  ack: number | null;
  redeliver: number | null;
  /** Publisher confirms sent back to publishers. */
  confirm: number | null;
  /** basic.get, including empty gets. */
  get: number | null;
  getEmpty: number | null;
  /** Unroutable messages returned to the publisher (mandatory flag). */
  returnUnroutable: number | null;
  /** Unroutable messages silently dropped. */
  dropUnroutable: number | null;
}

/** Objects created / closed per second across the cluster. */
export interface RabbitChurnRates {
  connectionCreated: number | null;
  connectionClosed: number | null;
  channelCreated: number | null;
  channelClosed: number | null;
  queueDeclared: number | null;
  queueCreated: number | null;
  queueDeleted: number | null;
}

export interface RabbitListener {
  node: string;
  protocol: string;
  ipAddress: string;
  port: number;
  isTls: boolean;
}

export interface RabbitWebContext {
  description: string;
  path: string;
  port: string;
  isTls: boolean;
}

export interface RabbitNode {
  name: string;
  isRunning: boolean;
  memoryUsed: number;
  memoryLimit: number;
  hasMemoryAlarm: boolean;
  diskFree: number;
  diskFreeLimit: number;
  hasDiskAlarm: boolean;
  fileDescriptorsUsed: number | null;
  fileDescriptorsTotal: number | null;
  processesUsed: number;
  processesTotal: number;
  uptimeMs: number;
  /** `disc` or `ram`. */
  type: string;
  cores: number | null;
  /** Erlang processes, sockets and run queue are under `processes*`. */
  runQueue: number | null;
}

export interface RabbitOverview {
  version: string;
  erlangVersion: string;
  clusterName: string;
  ratesMode: string;
  totals: {
    queues: number;
    exchanges: number;
    connections: number;
    channels: number;
    consumers: number;
  };
  messages: {
    total: number;
    ready: number;
    unacknowledged: number;
  };
  rates: RabbitMessageRates;
  samples: {
    publish: RabbitRateSample[];
    deliver: RabbitRateSample[];
    ready: RabbitRateSample[];
    unacknowledged: RabbitRateSample[];
  };
  nodes: RabbitNode[];
  /** Set when the user lacks the `monitoring` tag needed for node data. */
  nodesUnavailableReason: string | null;
  vhosts: string[];
  churn: RabbitChurnRates;
  listeners: RabbitListener[];
  contexts: RabbitWebContext[];
  currentUser: RabbitCurrentUser;
}

export interface RabbitQueueSummary {
  name: string;
  vhost: string;
  type: string;
  state: string;
  isDurable: boolean;
  isAutoDelete: boolean;
  isExclusive: boolean;
  messages: number;
  messagesReady: number;
  messagesUnacknowledged: number;
  consumers: number;
  /** 0..1, null when the broker does not report it. */
  consumerUtilisation: number | null;
  rates: RabbitMessageRates;
  memory: number | null;
  node: string | null;
  policy: string | null;
  arguments: Record<string, unknown>;
}

export interface RabbitQueuePage {
  items: RabbitQueueSummary[];
  page: number;
  pageCount: number;
  pageSize: number;
  totalCount: number;
  filteredCount: number;
}

export interface RabbitBinding {
  source: string;
  destination: string;
  destinationType: 'queue' | 'exchange';
  routingKey: string;
  arguments: Record<string, unknown>;
}

export interface RabbitConsumer {
  consumerTag: string;
  channelName: string;
  connectionName: string | null;
  peerHost: string | null;
  prefetchCount: number;
  isAckRequired: boolean;
  isActive: boolean;
  isExclusive: boolean;
}

export interface RabbitQueueDetail extends RabbitQueueSummary {
  effectivePolicy: Record<string, unknown>;
  consumerDetails: RabbitConsumer[];
  bindings: RabbitBinding[];
  idleSince: string | null;
  samples: {
    ready: RabbitRateSample[];
    unacknowledged: RabbitRateSample[];
    publish: RabbitRateSample[];
    deliver: RabbitRateSample[];
  };
}

export interface RabbitExchangeSummary {
  name: string;
  vhost: string;
  type: string;
  isDurable: boolean;
  isAutoDelete: boolean;
  isInternal: boolean;
  arguments: Record<string, unknown>;
  publishInRate: number | null;
  publishOutRate: number | null;
}

export interface RabbitExchangeDetail extends RabbitExchangeSummary {
  bindingsAsSource: RabbitBinding[];
  bindingsAsDestination: RabbitBinding[];
}

export interface RabbitConnectionSummary {
  name: string;
  user: string;
  vhost: string;
  peer: string;
  clientName: string | null;
  clientProduct: string | null;
  protocol: string;
  state: string;
  channels: number;
  receiveRate: number | null;
  sendRate: number | null;
  connectedAt: string | null;
}

export type RabbitChannelMode = 'normal' | 'confirm' | 'transactional';

export interface RabbitChannelSummary {
  name: string;
  connectionName: string;
  user: string;
  vhost: string;
  number: number;
  state: string;
  mode: RabbitChannelMode;
  prefetchCount: number;
  messagesUnacknowledged: number;
  messagesUnconfirmed: number;
  messagesUncommitted: number;
  acksUncommitted: number;
  consumerCount: number;
  rates: RabbitMessageRates;
}

export interface RabbitConnectionDetail extends RabbitConnectionSummary {
  authMechanism: string;
  heartbeatSeconds: number | null;
  frameMax: number | null;
  channelMax: number | null;
  tls: {
    protocol: string;
    cipher: string;
    peerCertificateSubject: string | null;
    peerCertificateIssuer: string | null;
    peerCertificateValidity: string | null;
  } | null;
  clientProperties: Record<string, unknown>;
  channelList: RabbitChannelSummary[];
}

export interface RabbitConnectionsSnapshot {
  connections: RabbitConnectionSummary[];
  channels: RabbitChannelSummary[];
}

export interface RabbitPublishInput {
  vhost: string;
  exchange: string;
  routingKey: string;
  payload: string;
  headers?: Record<string, string>;
  contentType?: string;
  isPersistent?: boolean;
}

export interface RabbitPublishResult {
  isRouted: boolean;
}

export interface RabbitUserPermission {
  vhost: string;
  configure: string;
  write: string;
  read: string;
}

export interface RabbitTopicPermission {
  vhost: string;
  exchange: string;
  write: string;
  read: string;
}

export interface RabbitUserSummary {
  name: string;
  tags: string[];
  hasPassword: boolean;
  vhosts: string[];
  /** Per-user limits such as max-connections / max-channels. */
  limits: Record<string, number>;
}

export interface RabbitCurrentUser {
  name: string;
  tags: string[];
}

export interface RabbitUsersSnapshot {
  currentUser: RabbitCurrentUser | null;
  users: RabbitUserSummary[];
  /** Set when the connected user may not list users (needs `administrator`). */
  unavailableReason: string | null;
}

export interface RabbitUserDetail extends RabbitUserSummary {
  permissions: RabbitUserPermission[];
  topicPermissions: RabbitTopicPermission[];
  /** The user OrcaQ is connected as, to decide which actions to offer. */
  currentUser: RabbitCurrentUser;
}

/** Per-user limits RabbitMQ supports. */
export type RabbitUserLimitName = 'max-connections' | 'max-channels';

export interface RabbitUpdateUserInput {
  name: string;
  tags: string[];
  /** New password. Leave out to keep the current one. */
  password?: string;
  /** Remove the password (certificate or external auth only). */
  shouldRemovePassword?: boolean;
}

/** Item counts shown before exporting or importing definitions. */
export interface RabbitDefinitionsSummary {
  format: 'cluster' | 'single_virtual_host' | 'unknown';
  rabbitmqVersion: string | null;
  counts: Record<string, number>;
}

export interface RabbitCreateUserInput {
  name: string;
  password: string;
  tags: string[];
  /** Optional permission granted right after the user is created. */
  permission?: RabbitUserPermission;
}

export interface RabbitVhostSummary {
  name: string;
  description: string;
  tags: string[];
  defaultQueueType: string;
  isTracing: boolean;
  isProtectedFromDeletion: boolean;
  /** Running state per node. */
  clusterState: Record<string, string>;
  messages: number;
  messagesReady: number;
  messagesUnacknowledged: number;
  rates: RabbitMessageRates;
  receiveRate: number | null;
  sendRate: number | null;
}

export interface RabbitVhostInput {
  name: string;
  description: string;
  tags: string[];
  defaultQueueType: 'classic' | 'quorum' | 'stream';
  isTracing: boolean;
}

/** User policies, or operator policies that cap what users may set. */
export type RabbitPolicyKind = 'user' | 'operator';

export interface RabbitPolicy {
  kind: RabbitPolicyKind;
  vhost: string;
  name: string;
  pattern: string;
  applyTo: string;
  priority: number;
  definition: Record<string, unknown>;
}

export interface RabbitPoliciesSnapshot {
  policies: RabbitPolicy[];
  /** Set when the user may not read one of the policy lists. */
  unavailableReason: string | null;
}

export type RabbitVhostLimitName = 'max-connections' | 'max-queues';

export interface RabbitLimitRow {
  /** vhost name for vhost limits, user name for user limits. */
  target: string;
  limits: Record<string, number>;
}

export interface RabbitLimitsSnapshot {
  vhostLimits: RabbitLimitRow[];
  userLimits: RabbitLimitRow[];
}

export interface RabbitFeatureFlag {
  name: string;
  state: 'enabled' | 'disabled' | 'state_changing' | 'unavailable' | string;
  stability: 'required' | 'stable' | 'experimental' | string;
  description: string;
  providedBy: string;
  docUrl: string | null;
}

export interface RabbitDeprecatedFeature {
  name: string;
  phase: string;
  description: string;
  providedBy: string;
  docUrl: string | null;
  isUsed: boolean;
}

export interface RabbitFeatureFlagsSnapshot {
  flags: RabbitFeatureFlag[];
  deprecated: RabbitDeprecatedFeature[];
}
