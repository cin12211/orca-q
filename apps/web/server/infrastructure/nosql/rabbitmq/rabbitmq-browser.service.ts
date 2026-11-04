import type {
  RabbitConnectionsSnapshot,
  RabbitExchangeDetail,
  RabbitExchangeSummary,
  RabbitQueueDetail,
  RabbitQueuePage,
} from '~/core/types/rabbitmq.types';
import type { BrokerConnectionInput } from '../broker/broker-connection';
import {
  rabbitApiPath,
  withRabbitManagement,
} from './rabbitmq-management.client';
import {
  asNumber,
  asRecord,
  asString,
  mapBinding,
  mapChannel,
  mapConnection,
  mapConsumer,
  mapExchangeSummary,
  mapLengthSamples,
  mapQueueSummary,
  mapRateSamples,
  RABBIT_SAMPLE_QUERY,
  type RawRecord,
} from './rabbitmq-mappers';

export const RABBIT_DEFAULT_EXCHANGE_PATH_NAME = 'amq.default';
const MAX_PAGE_SIZE = 500;
const MAX_CONNECTIONS = 500;

export async function listRabbitVhosts(input: BrokerConnectionInput) {
  return withRabbitManagement(input, async client => {
    const vhosts = await client.get<RawRecord[]>(rabbitApiPath('vhosts'));
    return vhosts.map(vhost => asString(vhost.name)).sort();
  });
}

export async function listRabbitQueues(
  input: BrokerConnectionInput,
  options: { vhost?: string; page?: number; pageSize?: number; search?: string }
): Promise<RabbitQueuePage> {
  return withRabbitManagement(input, async client => {
    const path = options.vhost
      ? rabbitApiPath('queues', options.vhost)
      : rabbitApiPath('queues');
    // Always paginate server side: brokers can hold tens of thousands of queues.
    const page = await client.get<RawRecord>(path, {
      page: Math.max(1, options.page ?? 1),
      page_size: Math.min(MAX_PAGE_SIZE, Math.max(1, options.pageSize ?? 100)),
      name: options.search?.trim() || undefined,
      use_regex: false,
    });
    const items = Array.isArray(page.items) ? page.items : [];

    return {
      items: items.map(item => mapQueueSummary(asRecord(item))),
      page: asNumber(page.page, 1),
      pageCount: asNumber(page.page_count),
      pageSize: asNumber(page.page_size),
      totalCount: asNumber(page.total_count),
      filteredCount: asNumber(page.filtered_count),
    };
  });
}

export async function getRabbitQueueDetail(
  input: BrokerConnectionInput,
  vhost: string,
  queueName: string
): Promise<RabbitQueueDetail> {
  return withRabbitManagement(input, async client => {
    const [queue, bindings] = await Promise.all([
      client.get<RawRecord>(
        rabbitApiPath('queues', vhost, queueName),
        RABBIT_SAMPLE_QUERY
      ),
      client.get<RawRecord[]>(
        rabbitApiPath('queues', vhost, queueName, 'bindings')
      ),
    ]);
    const messageStats = asRecord(queue.message_stats);
    const consumers = Array.isArray(queue.consumer_details)
      ? queue.consumer_details
      : [];

    return {
      ...mapQueueSummary(queue),
      effectivePolicy: asRecord(queue.effective_policy_definition),
      consumerDetails: consumers.map(consumer =>
        mapConsumer(asRecord(consumer))
      ),
      bindings: bindings.map(mapBinding),
      idleSince: typeof queue.idle_since === 'string' ? queue.idle_since : null,
      samples: {
        ready: mapLengthSamples(queue.messages_ready_details),
        unacknowledged: mapLengthSamples(queue.messages_unacknowledged_details),
        publish: mapRateSamples(messageStats.publish_details),
        deliver: mapRateSamples(messageStats.deliver_get_details),
      },
    };
  });
}

export async function listRabbitExchanges(
  input: BrokerConnectionInput,
  vhost?: string
): Promise<RabbitExchangeSummary[]> {
  return withRabbitManagement(input, async client => {
    const exchanges = await client.get<RawRecord[]>(
      vhost ? rabbitApiPath('exchanges', vhost) : rabbitApiPath('exchanges')
    );

    return exchanges.map(mapExchangeSummary);
  });
}

export async function getRabbitExchangeDetail(
  input: BrokerConnectionInput,
  vhost: string,
  exchangeName: string
): Promise<RabbitExchangeDetail> {
  const pathName = exchangeName || RABBIT_DEFAULT_EXCHANGE_PATH_NAME;

  return withRabbitManagement(input, async client => {
    const [exchange, asSource, asDestination] = await Promise.all([
      client.get<RawRecord>(rabbitApiPath('exchanges', vhost, pathName)),
      client.get<RawRecord[]>(
        rabbitApiPath('exchanges', vhost, pathName, 'bindings', 'source')
      ),
      client.get<RawRecord[]>(
        rabbitApiPath('exchanges', vhost, pathName, 'bindings', 'destination')
      ),
    ]);

    return {
      ...mapExchangeSummary(exchange),
      bindingsAsSource: asSource.map(mapBinding),
      bindingsAsDestination: asDestination.map(mapBinding),
    };
  });
}

export async function getRabbitConnections(
  input: BrokerConnectionInput,
  vhost?: string
): Promise<RabbitConnectionsSnapshot> {
  return withRabbitManagement(input, async client => {
    const query = { page: 1, page_size: MAX_CONNECTIONS };
    const [connections, channels] = await Promise.all([
      client.get<RawRecord>(
        vhost
          ? rabbitApiPath('vhosts', vhost, 'connections')
          : rabbitApiPath('connections'),
        vhost ? undefined : query
      ),
      client.get<RawRecord>(
        vhost
          ? rabbitApiPath('vhosts', vhost, 'channels')
          : rabbitApiPath('channels'),
        vhost ? undefined : query
      ),
    ]);
    // Paged endpoints wrap results in `items`; per-vhost ones return arrays.
    const toItems = (value: unknown) =>
      (Array.isArray(value) ? value : asRecord(value).items) as
        | RawRecord[]
        | undefined;

    return {
      connections: (toItems(connections) ?? []).map(mapConnection),
      channels: (toItems(channels) ?? []).map(mapChannel),
    };
  });
}
