import type {
  Admin,
  BaseOptions,
  Consumer,
  Producer,
} from '@platformatic/kafka';
import { EKafkaSaslMechanism } from '~/core/types/entities/connection.entity';
import {
  BrokerConnectionError,
  isBrokerTlsEnabled,
  type BrokerConnectionInput,
} from '../broker/broker-connection';

export const DEFAULT_KAFKA_PORT = 9092;
export const MIN_KAFKA_VERSION_LABEL = '3.5';
const KAFKA_CLIENT_ID = 'orcaq';
const CONNECT_TIMEOUT_MS = 10_000;
const REQUEST_TIMEOUT_MS = 20_000;
const FETCH_API_KEY = 1;
/** Fetch v15 shipped with Kafka 3.5, the oldest broker the client supports. */
const MIN_FETCH_API_VERSION = 15;
/**
 * Raw fetches never join a group, but the Consumer class requires a group id.
 * This id is never registered on the broker.
 */
export const KAFKA_UNUSED_GROUP_ID = 'orcaq-browser-no-group';

// Loaded lazily so the module (Node >= 22) is only required when a Kafka
// connection is actually used.
const loadKafka = () => import('@platformatic/kafka');

export function resolveKafkaBrokers(input: BrokerConnectionInput) {
  const configured = (input.broker?.kafka?.brokers ?? [])
    .map(item => item.trim())
    .filter(Boolean);

  if (configured.length) return configured;

  if (input.host) {
    return [`${input.host}:${input.port || DEFAULT_KAFKA_PORT}`];
  }

  throw new BrokerConnectionError(
    'At least one Kafka bootstrap server is required.',
    'Add brokers as host:port, for example localhost:9092.'
  );
}

export function buildKafkaOptions(input: BrokerConnectionInput): BaseOptions {
  if (input.ssh?.enabled) {
    throw new BrokerConnectionError(
      'SSH tunnels are not supported for Kafka connections.',
      'Kafka clients connect to every broker address the cluster advertises, which a single tunnel cannot cover.'
    );
  }

  const mechanism = input.broker?.kafka?.saslMechanism;
  const useTls = isBrokerTlsEnabled(input.ssl);

  return {
    clientId: input.broker?.kafka?.clientId || KAFKA_CLIENT_ID,
    bootstrapBrokers: resolveKafkaBrokers(input),
    connectTimeout: CONNECT_TIMEOUT_MS,
    requestTimeout: REQUEST_TIMEOUT_MS,
    retries: 2,
    ...(useTls
      ? {
          tls: {
            ca: input.ssl?.ca || undefined,
            cert: input.ssl?.cert || undefined,
            key: input.ssl?.key || undefined,
            rejectUnauthorized: input.ssl?.rejectUnauthorized ?? true,
          },
        }
      : {}),
    ...(mechanism && mechanism !== EKafkaSaslMechanism.NONE
      ? {
          sasl: {
            mechanism,
            username: input.username ?? '',
            password: input.password ?? '',
          },
        }
      : {}),
  };
}

export async function withKafkaAdmin<T>(
  input: BrokerConnectionInput,
  run: (admin: Admin) => Promise<T>
) {
  const { Admin } = await loadKafka();
  const admin = new Admin(buildKafkaOptions(input));

  try {
    return await run(admin);
  } finally {
    await admin.close().catch(() => undefined);
  }
}

/**
 * Topic metadata, with the client's "Unknown topic <name>." error turned
 * into a readable not-found error instead of a generic connection failure.
 */
export async function readKafkaTopicMetadata(admin: Admin, topics: string[]) {
  try {
    return await admin.metadata({ topics });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const missing = topics.find(topic =>
      message.startsWith(`Unknown topic ${topic}`)
    );

    if (missing === undefined) throw error;
    throw new BrokerConnectionError(`Topic "${missing}" was not found.`);
  }
}

export async function createKafkaReader(
  input: BrokerConnectionInput
): Promise<Consumer> {
  const { Consumer } = await loadKafka();
  return new Consumer({
    ...buildKafkaOptions(input),
    groupId: KAFKA_UNUSED_GROUP_ID,
  });
}

export async function withKafkaProducer<T>(
  input: BrokerConnectionInput,
  run: (producer: Producer<string, string, string, string>) => Promise<T>
) {
  const { Producer, stringSerializers } = await loadKafka();
  const producer = new Producer({
    ...buildKafkaOptions(input),
    serializers: stringSerializers,
  });

  try {
    return await run(producer);
  } finally {
    await producer.close().catch(() => undefined);
  }
}

export async function verifyKafkaConnection(input: BrokerConnectionInput) {
  return withKafkaAdmin(input, async admin => {
    await admin.metadata({ topics: [] });
    const apis = await admin.listApis();
    const fetchApi = apis.find(api => api.apiKey === FETCH_API_KEY);

    if (!fetchApi || fetchApi.maxVersion < MIN_FETCH_API_VERSION) {
      throw new BrokerConnectionError(
        'This Kafka version is not supported.',
        `OrcaQ requires Apache Kafka ${MIN_KAFKA_VERSION_LABEL} or newer (or a compatible platform such as Confluent Platform 7.5+).`,
        'KAFKA_VERSION',
        `Fetch API max version ${fetchApi?.maxVersion ?? 'unknown'}`
      );
    }

    return true;
  });
}
