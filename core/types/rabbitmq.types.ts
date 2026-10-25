export interface RabbitRateSample {
  timestamp: number;
  value: number;
}

export interface RabbitMessageRates {
  publish: number | null;
  deliver: number | null;
  ack: number | null;
  redeliver: number | null;
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

export interface RabbitChannelSummary {
  name: string;
  connectionName: string;
  user: string;
  vhost: string;
  number: number;
  state: string;
  prefetchCount: number;
  messagesUnacknowledged: number;
  consumerCount: number;
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
