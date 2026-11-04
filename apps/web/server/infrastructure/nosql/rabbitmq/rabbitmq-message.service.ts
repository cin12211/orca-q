import type { BrokerMessage } from '~/core/types/broker-message.types';
import type {
  RabbitPublishInput,
  RabbitPublishResult,
} from '~/core/types/rabbitmq.types';
import type { BrokerConnectionInput } from '../broker/broker-connection';
import { RABBIT_DEFAULT_EXCHANGE_PATH_NAME } from './rabbitmq-browser.service';
import {
  rabbitApiPath,
  withRabbitManagement,
} from './rabbitmq-management.client';
import {
  asNumber,
  asRecord,
  asString,
  type RawRecord,
} from './rabbitmq-mappers';

export const RABBIT_MAX_PEEK_COUNT = 50;
export const BROKER_PAYLOAD_TRUNCATE_BYTES = 256 * 1024;

/**
 * The only ack mode we ever send. Messages are requeued, exactly like the
 * Management UI default, so peeking never drops a message.
 */
const SAFE_PEEK_ACK_MODE = 'ack_requeue_true';

const stringifyHeaders = (headers: unknown) =>
  Object.fromEntries(
    Object.entries(asRecord(headers)).map(([key, value]) => [
      key,
      typeof value === 'string' ? value : JSON.stringify(value),
    ])
  );

function mapPeekedMessage(raw: RawRecord, index: number): BrokerMessage {
  const properties = asRecord(raw.properties);
  const timestamp = asNumber(properties.timestamp, 0);
  const payloadBytes = asNumber(raw.payload_bytes);
  const payload = asString(raw.payload);
  const isBase64 = raw.payload_encoding === 'base64';
  const deliveredBytes = isBase64
    ? Buffer.byteLength(payload, 'base64')
    : Buffer.byteLength(payload);

  const { headers, ...otherProperties } = properties;

  return {
    id: `${index}`,
    payload,
    payloadTransport: isBase64 ? 'base64' : 'text',
    payloadBytes,
    isTruncated: deliveredBytes < payloadBytes,
    headers: stringifyHeaders(headers),
    // AMQP timestamps are seconds since epoch.
    timestamp: timestamp ? new Date(timestamp * 1000).toISOString() : null,
    exchange: asString(raw.exchange),
    routingKey: asString(raw.routing_key),
    isRedelivered: Boolean(raw.redelivered),
    properties: otherProperties,
  };
}

export async function peekRabbitMessages(
  input: BrokerConnectionInput,
  options: { vhost: string; queueName: string; count?: number }
): Promise<BrokerMessage[]> {
  const count = Math.min(
    RABBIT_MAX_PEEK_COUNT,
    Math.max(1, options.count ?? 20)
  );

  return withRabbitManagement(input, async client => {
    const messages = await client.post<RawRecord[]>(
      rabbitApiPath('queues', options.vhost, options.queueName, 'get'),
      {
        count,
        ackmode: SAFE_PEEK_ACK_MODE,
        encoding: 'auto',
        truncate: BROKER_PAYLOAD_TRUNCATE_BYTES,
      }
    );

    return messages.map(mapPeekedMessage);
  });
}

export async function publishRabbitMessage(
  input: BrokerConnectionInput,
  message: RabbitPublishInput
): Promise<RabbitPublishResult> {
  const properties: Record<string, unknown> = {
    delivery_mode: message.isPersistent ? 2 : 1,
  };

  if (message.contentType) properties.content_type = message.contentType;
  if (message.headers && Object.keys(message.headers).length) {
    properties.headers = message.headers;
  }

  return withRabbitManagement(input, async client => {
    const result = await client.post<RawRecord>(
      rabbitApiPath(
        'exchanges',
        message.vhost,
        message.exchange || RABBIT_DEFAULT_EXCHANGE_PATH_NAME,
        'publish'
      ),
      {
        properties,
        routing_key: message.routingKey,
        payload: message.payload,
        payload_encoding: 'string',
      }
    );

    return { isRouted: Boolean(result.routed) };
  });
}
