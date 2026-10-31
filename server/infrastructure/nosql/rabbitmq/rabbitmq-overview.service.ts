import type { RabbitOverview } from '~/core/types/rabbitmq.types';
import {
  BrokerConnectionError,
  compareVersions,
  type BrokerConnectionInput,
} from '../broker/broker-connection';
import {
  rabbitApiPath,
  withRabbitManagement,
  type RabbitManagementClient,
} from './rabbitmq-management.client';
import {
  asArray,
  asNumber,
  asRecord,
  asString,
  asTagList,
  mapChurnRates,
  mapLengthSamples,
  mapListener,
  mapMessageRates,
  mapNode,
  mapRateSamples,
  mapWebContext,
  RABBIT_SAMPLE_QUERY,
  type RawRecord,
} from './rabbitmq-mappers';

export const MIN_RABBITMQ_VERSION = '3.12.0';

async function readOverview(client: RabbitManagementClient) {
  try {
    return await client.get<RawRecord>('/api/overview', RABBIT_SAMPLE_QUERY);
  } catch (error) {
    if (error instanceof BrokerConnectionError) throw error;

    const code = (error as { code?: string }).code;
    // Connection refused/reset on the management port usually means the
    // plugin is not enabled, so say how to enable it.
    if (code === 'ECONNREFUSED' || code === 'ECONNRESET') {
      throw new BrokerConnectionError(
        'Could not reach the RabbitMQ Management API.',
        'Enable the plugin with "rabbitmq-plugins enable rabbitmq_management" and check that port 15672 (or your custom management port) is reachable.',
        code,
        (error as Error).message
      );
    }

    throw error;
  }
}

/** Throw a readable error when the server is older than we support. */
export function assertSupportedRabbitVersion(version: string) {
  if (!version || compareVersions(version, MIN_RABBITMQ_VERSION) < 0) {
    throw new BrokerConnectionError(
      `RabbitMQ ${version || '(unknown version)'} is not supported.`,
      `OrcaQ requires RabbitMQ ${MIN_RABBITMQ_VERSION} or newer.`,
      'RABBITMQ_VERSION'
    );
  }
}

export async function verifyRabbitConnection(input: BrokerConnectionInput) {
  return withRabbitManagement(input, async client => {
    const overview = await readOverview(client);
    assertSupportedRabbitVersion(asString(overview.rabbitmq_version));
    return true;
  });
}

export async function getRabbitOverview(
  input: BrokerConnectionInput
): Promise<RabbitOverview> {
  return withRabbitManagement(input, async client => {
    const overview = await readOverview(client);
    const objectTotals = asRecord(overview.object_totals);
    const queueTotals = asRecord(overview.queue_totals);
    const messageStats = asRecord(overview.message_stats);

    const [nodesResult, vhosts, whoami] = await Promise.all([
      client
        .get<RawRecord[]>(rabbitApiPath('nodes'))
        .then(nodes => ({ nodes, reason: null as string | null }))
        .catch((error: unknown) => {
          // Users without the `monitoring` tag get 401 "Not monitor user"
          // here even though their credentials are valid.
          if (
            error instanceof BrokerConnectionError &&
            (error.code === 'RABBITMQ_401' || error.code === 'RABBITMQ_403')
          ) {
            return {
              nodes: [] as RawRecord[],
              reason:
                'Node details need the "monitoring" tag on this RabbitMQ user.',
            };
          }
          throw error;
        }),
      client.get<RawRecord[]>(rabbitApiPath('vhosts')),
      client.get<RawRecord>(rabbitApiPath('whoami')),
    ]);

    return {
      version: asString(overview.rabbitmq_version),
      erlangVersion: asString(overview.erlang_version),
      clusterName: asString(overview.cluster_name),
      ratesMode: asString(overview.rates_mode, 'basic'),
      totals: {
        queues: asNumber(objectTotals.queues),
        exchanges: asNumber(objectTotals.exchanges),
        connections: asNumber(objectTotals.connections),
        channels: asNumber(objectTotals.channels),
        consumers: asNumber(objectTotals.consumers),
      },
      messages: {
        total: asNumber(queueTotals.messages),
        ready: asNumber(queueTotals.messages_ready),
        unacknowledged: asNumber(queueTotals.messages_unacknowledged),
      },
      rates: mapMessageRates(messageStats),
      samples: {
        publish: mapRateSamples(messageStats.publish_details),
        deliver: mapRateSamples(messageStats.deliver_get_details),
        ready: mapLengthSamples(queueTotals.messages_ready_details),
        unacknowledged: mapLengthSamples(
          queueTotals.messages_unacknowledged_details
        ),
      },
      nodes: nodesResult.nodes.map(mapNode),
      nodesUnavailableReason: nodesResult.reason,
      vhosts: vhosts.map(vhost => asString(vhost.name)).sort(),
      churn: mapChurnRates(overview.churn_rates),
      listeners: asArray(overview.listeners).map(mapListener),
      contexts: asArray(overview.contexts).map(mapWebContext),
      currentUser: {
        name: asString(whoami.name),
        tags: asTagList(whoami.tags),
      },
    };
  });
}
