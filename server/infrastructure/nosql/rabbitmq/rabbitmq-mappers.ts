import type {
  RabbitBinding,
  RabbitChannelSummary,
  RabbitChurnRates,
  RabbitConnectionSummary,
  RabbitConsumer,
  RabbitExchangeSummary,
  RabbitListener,
  RabbitMessageRates,
  RabbitNode,
  RabbitQueueSummary,
  RabbitRateSample,
  RabbitWebContext,
} from '~/core/types/rabbitmq.types';

/** Raw Management API JSON. Fields vary by version and stats mode. */
export type RawRecord = Record<string, unknown>;

/** Sample window requested from the Management API (10 minutes, 30s steps). */
export const RABBIT_SAMPLE_QUERY = {
  lengths_age: 600,
  lengths_incr: 30,
  msg_rates_age: 600,
  msg_rates_incr: 30,
} as const;

export const asRecord = (value: unknown): RawRecord =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as RawRecord)
    : {};

export const asNumber = (value: unknown, fallback = 0) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const asNullableNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const asString = (value: unknown, fallback = '') =>
  typeof value === 'string' ? value : fallback;

export const asArray = (value: unknown): RawRecord[] =>
  Array.isArray(value) ? value.map(asRecord) : [];

/** Tags arrive as an array (4.x) or a comma separated string (3.x). */
export const asTagList = (value: unknown) =>
  Array.isArray(value)
    ? value.map(tag => String(tag)).filter(Boolean)
    : String(value ?? '')
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean);

/** TLS listeners report protocols such as `amqp/ssl`, `https` or `mqtt/ssl`. */
const isTlsProtocol = (protocol: string) =>
  protocol.endsWith('/ssl') || protocol === 'https';

const rateOf = (stats: RawRecord, key: string) =>
  asNullableNumber(asRecord(stats[`${key}_details`]).rate);

export function mapMessageRates(messageStats: unknown): RabbitMessageRates {
  const stats = asRecord(messageStats);

  return {
    publish: rateOf(stats, 'publish'),
    deliver: rateOf(stats, 'deliver_get'),
    ack: rateOf(stats, 'ack'),
    redeliver: rateOf(stats, 'redeliver'),
    confirm: rateOf(stats, 'confirm'),
    get: rateOf(stats, 'get'),
    getEmpty: rateOf(stats, 'get_empty'),
    returnUnroutable: rateOf(stats, 'return_unroutable'),
    dropUnroutable: rateOf(stats, 'drop_unroutable'),
  };
}

export function mapChurnRates(churn: unknown): RabbitChurnRates {
  const stats = asRecord(churn);

  return {
    connectionCreated: rateOf(stats, 'connection_created'),
    connectionClosed: rateOf(stats, 'connection_closed'),
    channelCreated: rateOf(stats, 'channel_created'),
    channelClosed: rateOf(stats, 'channel_closed'),
    queueDeclared: rateOf(stats, 'queue_declared'),
    queueCreated: rateOf(stats, 'queue_created'),
    queueDeleted: rateOf(stats, 'queue_deleted'),
  };
}

export function mapListener(raw: RawRecord): RabbitListener {
  return {
    node: asString(raw.node),
    protocol: asString(raw.protocol),
    ipAddress: asString(raw.ip_address),
    port: asNumber(raw.port),
    isTls: isTlsProtocol(asString(raw.protocol)),
  };
}

export function mapWebContext(raw: RawRecord): RabbitWebContext {
  return {
    description: asString(raw.description),
    path: asString(raw.path),
    port: String(raw.port ?? ''),
    isTls: Boolean(raw.ssl) || isTlsProtocol(asString(raw.protocol)),
  };
}

const rawSamples = (details: unknown) => {
  const samples = asRecord(details).samples;
  return Array.isArray(samples)
    ? samples
        .map(sample => asRecord(sample))
        .map(sample => ({
          timestamp: asNumber(sample.timestamp),
          value: asNumber(sample.sample),
        }))
        .sort((left, right) => left.timestamp - right.timestamp)
    : [];
};

/** Length samples (queue depth) are absolute values. */
export function mapLengthSamples(details: unknown): RabbitRateSample[] {
  return rawSamples(details);
}

/**
 * Rate samples come back as cumulative counters; turn consecutive samples into
 * per-second rates so they can be drawn as a sparkline.
 */
export function mapRateSamples(details: unknown): RabbitRateSample[] {
  const samples = rawSamples(details);
  const rates: RabbitRateSample[] = [];

  for (let index = 1; index < samples.length; index++) {
    const previous = samples[index - 1];
    const current = samples[index];
    const seconds = (current.timestamp - previous.timestamp) / 1000;

    rates.push({
      timestamp: current.timestamp,
      value:
        seconds > 0
          ? Math.max(0, (current.value - previous.value) / seconds)
          : 0,
    });
  }

  return rates;
}

export function mapNode(raw: RawRecord): RabbitNode {
  return {
    name: asString(raw.name),
    isRunning: Boolean(raw.running),
    memoryUsed: asNumber(raw.mem_used),
    memoryLimit: asNumber(raw.mem_limit),
    hasMemoryAlarm: Boolean(raw.mem_alarm),
    diskFree: asNumber(raw.disk_free),
    diskFreeLimit: asNumber(raw.disk_free_limit),
    hasDiskAlarm: Boolean(raw.disk_free_alarm),
    fileDescriptorsUsed: asNullableNumber(raw.fd_used),
    fileDescriptorsTotal: asNullableNumber(raw.fd_total),
    processesUsed: asNumber(raw.proc_used),
    processesTotal: asNumber(raw.proc_total),
    uptimeMs: asNumber(raw.uptime),
    type: asString(raw.type, 'disc'),
    cores: asNullableNumber(raw.processors),
    runQueue: asNullableNumber(raw.run_queue),
  };
}

export function mapQueueSummary(raw: RawRecord): RabbitQueueSummary {
  return {
    name: asString(raw.name),
    vhost: asString(raw.vhost),
    type: asString(raw.type, 'classic'),
    state: asString(raw.state, 'unknown'),
    isDurable: Boolean(raw.durable),
    isAutoDelete: Boolean(raw.auto_delete),
    isExclusive: Boolean(raw.exclusive),
    messages: asNumber(raw.messages),
    messagesReady: asNumber(raw.messages_ready),
    messagesUnacknowledged: asNumber(raw.messages_unacknowledged),
    consumers: asNumber(raw.consumers),
    consumerUtilisation: asNullableNumber(
      raw.consumer_utilisation ?? raw.consumer_capacity
    ),
    rates: mapMessageRates(raw.message_stats),
    memory: asNullableNumber(raw.memory),
    node: typeof raw.node === 'string' ? raw.node : null,
    policy: typeof raw.policy === 'string' && raw.policy ? raw.policy : null,
    arguments: asRecord(raw.arguments),
  };
}

export function mapBinding(raw: RawRecord): RabbitBinding {
  return {
    source: asString(raw.source),
    destination: asString(raw.destination),
    destinationType: raw.destination_type === 'exchange' ? 'exchange' : 'queue',
    routingKey: asString(raw.routing_key),
    arguments: asRecord(raw.arguments),
  };
}

export function mapConsumer(raw: RawRecord): RabbitConsumer {
  const channel = asRecord(raw.channel_details);

  return {
    consumerTag: asString(raw.consumer_tag),
    channelName: asString(channel.name),
    connectionName:
      typeof channel.connection_name === 'string'
        ? channel.connection_name
        : null,
    peerHost:
      typeof channel.peer_host === 'string'
        ? `${channel.peer_host}:${asNumber(channel.peer_port)}`
        : null,
    prefetchCount: asNumber(raw.prefetch_count),
    isAckRequired: Boolean(raw.ack_required),
    isActive: raw.active === undefined ? true : Boolean(raw.active),
    isExclusive: Boolean(raw.exclusive),
  };
}

export function mapExchangeSummary(raw: RawRecord): RabbitExchangeSummary {
  const stats = asRecord(raw.message_stats);

  return {
    name: asString(raw.name),
    vhost: asString(raw.vhost),
    type: asString(raw.type),
    isDurable: Boolean(raw.durable),
    isAutoDelete: Boolean(raw.auto_delete),
    isInternal: Boolean(raw.internal),
    arguments: asRecord(raw.arguments),
    publishInRate: rateOf(stats, 'publish_in'),
    publishOutRate: rateOf(stats, 'publish_out'),
  };
}

export function mapConnection(raw: RawRecord): RabbitConnectionSummary {
  const clientProperties = asRecord(raw.client_properties);
  const connectedAt = asNullableNumber(raw.connected_at);

  return {
    name: asString(raw.name),
    user: asString(raw.user),
    vhost: asString(raw.vhost),
    peer: `${asString(raw.peer_host)}:${asNumber(raw.peer_port)}`,
    clientName:
      typeof clientProperties.connection_name === 'string'
        ? clientProperties.connection_name
        : null,
    clientProduct:
      typeof clientProperties.product === 'string'
        ? `${clientProperties.product} ${asString(clientProperties.version)}`.trim()
        : null,
    protocol: asString(raw.protocol),
    state: asString(raw.state, 'unknown'),
    channels: asNumber(raw.channels),
    receiveRate: asNullableNumber(asRecord(raw.recv_oct_details).rate),
    sendRate: asNullableNumber(asRecord(raw.send_oct_details).rate),
    connectedAt: connectedAt ? new Date(connectedAt).toISOString() : null,
  };
}

export function mapChannel(raw: RawRecord): RabbitChannelSummary {
  const connection = asRecord(raw.connection_details);

  return {
    name: asString(raw.name),
    connectionName: asString(connection.name),
    user: asString(raw.user),
    vhost: asString(raw.vhost),
    number: asNumber(raw.number),
    state: asString(raw.state, 'unknown'),
    mode: raw.transactional
      ? 'transactional'
      : raw.confirm
        ? 'confirm'
        : 'normal',
    prefetchCount: asNumber(raw.prefetch_count),
    messagesUnacknowledged: asNumber(raw.messages_unacknowledged),
    messagesUnconfirmed: asNumber(raw.messages_unconfirmed),
    messagesUncommitted: asNumber(raw.messages_uncommitted),
    acksUncommitted: asNumber(raw.acks_uncommitted),
    consumerCount: asNumber(raw.consumer_count),
    rates: mapMessageRates(raw.message_stats),
  };
}
