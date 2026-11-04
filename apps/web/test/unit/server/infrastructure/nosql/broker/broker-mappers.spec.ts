import { describe, expect, it } from 'vitest';
import {
  EConnectionMethod,
  EKafkaSaslMechanism,
  ESSLMode,
} from '~/core/types/entities/connection.entity';
import {
  BrokerConnectionError,
  isBrokerTlsEnabled,
  parseBrokerBody,
} from '~/server/infrastructure/nosql/broker/broker-connection';
import { resolveFetchTargets } from '~/server/infrastructure/nosql/kafka/kafka-message.service';
import { isInternalKafkaTopic } from '~/server/infrastructure/nosql/kafka/kafka-topic.service';
import {
  buildKafkaOptions,
  readKafkaTopicMetadata,
} from '~/server/infrastructure/nosql/kafka/kafka.client';
import { rabbitApiPath } from '~/server/infrastructure/nosql/rabbitmq/rabbitmq-management.client';
import {
  asNullableNumber,
  asNumber,
  asRecord,
  asString,
  asTagList,
  mapBinding,
  mapChannel,
  mapChurnRates,
  mapConnection,
  mapConsumer,
  mapExchangeSummary,
  mapListener,
  mapMessageRates,
  mapNode,
  mapWebContext,
} from '~/server/infrastructure/nosql/rabbitmq/rabbitmq-mappers';

const formConnection = { method: EConnectionMethod.FORM };

describe('RabbitMQ Management API paths', () => {
  it('encodes each segment, including the default vhost', () => {
    expect(rabbitApiPath('queues', '/', 'orders.created')).toBe(
      '/api/queues/%2F/orders.created'
    );
    expect(rabbitApiPath('users', 'a b')).toBe('/api/users/a%20b');
  });
});

describe('RabbitMQ value readers', () => {
  it('fall back safely on unexpected values', () => {
    expect(asRecord(['a'])).toEqual({});
    expect(asRecord(null)).toEqual({});
    expect(asNumber('12')).toBe(12);
    expect(asNumber('x', 5)).toBe(5);
    expect(asNullableNumber('')).toBeNull();
    expect(asNullableNumber(undefined)).toBeNull();
    expect(asNullableNumber('3.5')).toBe(3.5);
    expect(asString(42, 'fallback')).toBe('fallback');
  });
});

describe('RabbitMQ object mappers', () => {
  it('maps nodes with alarms and optional file descriptors', () => {
    const node = mapNode({
      name: 'rabbit@node1',
      running: true,
      mem_used: 100,
      mem_limit: 400,
      mem_alarm: true,
      disk_free_alarm: false,
    });

    expect(node).toMatchObject({
      name: 'rabbit@node1',
      isRunning: true,
      memoryUsed: 100,
      hasMemoryAlarm: true,
      hasDiskAlarm: false,
      fileDescriptorsUsed: null,
    });
  });

  it('maps exchange-to-exchange bindings and defaults to queues', () => {
    expect(
      mapBinding({
        source: 'events',
        destination: 'audit',
        destination_type: 'exchange',
        routing_key: 'audit.#',
      })
    ).toMatchObject({ destinationType: 'exchange', routingKey: 'audit.#' });
    expect(mapBinding({}).destinationType).toBe('queue');
  });

  it('maps consumers and treats a missing active flag as active', () => {
    const consumer = mapConsumer({
      consumer_tag: 'ctag-1',
      channel_details: {
        name: 'channel 1',
        connection_name: 'conn',
        peer_host: '10.0.0.1',
        peer_port: 5000,
      },
      ack_required: true,
    });

    expect(consumer).toMatchObject({
      consumerTag: 'ctag-1',
      peerHost: '10.0.0.1:5000',
      isAckRequired: true,
      isActive: true,
    });
  });

  it('reads exchange publish rates from message stats', () => {
    const exchange = mapExchangeSummary({
      name: 'events',
      type: 'topic',
      internal: true,
      message_stats: { publish_in_details: { rate: 1.5 } },
    });

    expect(exchange).toMatchObject({
      isInternal: true,
      publishInRate: 1.5,
      publishOutRate: null,
    });
  });

  it('maps connections with client properties and connect time', () => {
    const connection = mapConnection({
      name: '172.0.0.1:5000 -> 172.0.0.2:5672',
      peer_host: '172.0.0.1',
      peer_port: 5000,
      client_properties: {
        connection_name: 'orders-worker',
        product: 'amqplib',
        version: '0.10.4',
      },
      connected_at: 0,
      recv_oct_details: { rate: 10 },
    });

    expect(connection).toMatchObject({
      peer: '172.0.0.1:5000',
      clientName: 'orders-worker',
      clientProduct: 'amqplib 0.10.4',
      state: 'unknown',
      receiveRate: 10,
      sendRate: null,
      connectedAt: null,
    });
  });

  it('maps channels with their connection name', () => {
    expect(
      mapChannel({
        name: 'conn (1)',
        number: 1,
        connection_details: { name: 'conn' },
        prefetch_count: 10,
      })
    ).toMatchObject({ connectionName: 'conn', number: 1, prefetchCount: 10 });
  });
});

describe('broker request bodies', () => {
  it('parses the connection plus route fields', () => {
    const body = parseBrokerBody(
      { connection: { ...formConnection, host: 'localhost' }, vhost: '/' },
      {}
    );

    expect(body.connection.host).toBe('localhost');
  });

  it('rejects an unknown connection method or a bad Kafka mechanism', () => {
    expect(() =>
      parseBrokerBody({ connection: { method: 'telepathy' } }, {})
    ).toThrow();
    expect(() =>
      parseBrokerBody(
        {
          connection: {
            ...formConnection,
            broker: { kafka: { brokers: [], saslMechanism: 'GSSAPI' } },
          },
        },
        {}
      )
    ).toThrow();
  });

  it('only enables TLS for a non-disabled SSL mode', () => {
    expect(isBrokerTlsEnabled()).toBe(false);
    expect(isBrokerTlsEnabled({ mode: ESSLMode.DISABLE })).toBe(false);
    expect(isBrokerTlsEnabled({ mode: ESSLMode.REQUIRE })).toBe(true);
  });
});

describe('Kafka client options', () => {
  it('adds SASL only for a real mechanism', () => {
    const withSasl = buildKafkaOptions({
      ...formConnection,
      username: 'orcaq',
      password: 'secret',
      broker: {
        kafka: {
          brokers: ['b1:9092'],
          saslMechanism: EKafkaSaslMechanism.SCRAM_SHA_256,
        },
      },
    });
    const withoutSasl = buildKafkaOptions({
      ...formConnection,
      broker: {
        kafka: {
          brokers: ['b1:9092'],
          saslMechanism: EKafkaSaslMechanism.NONE,
        },
      },
    });

    expect(withSasl.sasl).toEqual({
      mechanism: 'SCRAM-SHA-256',
      username: 'orcaq',
      password: 'secret',
    });
    expect(withoutSasl.sasl).toBeUndefined();
  });

  it('passes TLS settings through when SSL is on', () => {
    const options = buildKafkaOptions({
      ...formConnection,
      ssl: { mode: ESSLMode.VERIFY_FULL, ca: 'CA', rejectUnauthorized: false },
      broker: { kafka: { brokers: ['b1:9093'] } },
    });

    expect(options.tls).toMatchObject({ ca: 'CA', rejectUnauthorized: false });
  });

  it('asks for a bootstrap server when none is configured', () => {
    expect(() => buildKafkaOptions(formConnection)).toThrow(
      BrokerConnectionError
    );
  });
});

describe('Kafka topic helpers', () => {
  it('recognises internal topics', () => {
    expect(isInternalKafkaTopic('__consumer_offsets')).toBe(true);
    expect(isInternalKafkaTopic('orders')).toBe(false);
  });

  it('resolves every partition or only the requested ones', () => {
    const topic = {
      id: 'topic-id',
      partitions: [{ leader: 1 }, { leader: 2 }, { leader: 1 }],
    } as unknown as Parameters<typeof resolveFetchTargets>[1];

    expect(resolveFetchTargets('orders', topic)).toHaveLength(3);
    expect(resolveFetchTargets('orders', topic, [2])).toEqual([
      { topicId: 'topic-id', partition: 2, leader: 1 },
    ]);
  });

  it('turns the client unknown-topic error into a not-found error', async () => {
    const failingAdmin = (message: string) =>
      ({
        metadata: () => Promise.reject(new Error(message)),
      }) as unknown as Parameters<typeof readKafkaTopicMetadata>[0];

    await expect(
      readKafkaTopicMetadata(failingAdmin('Unknown topic orcaq.ghost.'), [
        'orcaq.ghost',
      ])
    ).rejects.toThrow('Topic "orcaq.ghost" was not found.');
    await expect(
      readKafkaTopicMetadata(failingAdmin('Connection refused'), ['orders'])
    ).rejects.toThrow('Connection refused');
  });

  it('reports a missing topic by name', () => {
    expect(() => resolveFetchTargets('ghost', undefined)).toThrow(
      /Topic "ghost" was not found/
    );
  });
});

describe('RabbitMQ insight mappers', () => {
  it('reads confirm, get and unroutable rates', () => {
    const rates = mapMessageRates({
      confirm_details: { rate: 2 },
      get_empty_details: { rate: 0.5 },
      drop_unroutable_details: { rate: 1 },
    });

    expect(rates).toMatchObject({
      confirm: 2,
      getEmpty: 0.5,
      dropUnroutable: 1,
      returnUnroutable: null,
    });
  });

  it('reads churn rates per second', () => {
    expect(
      mapChurnRates({
        connection_created_details: { rate: 3 },
        queue_deleted_details: { rate: 0 },
      })
    ).toMatchObject({
      connectionCreated: 3,
      queueDeleted: 0,
      channelClosed: null,
    });
  });

  it('flags TLS listeners and contexts', () => {
    expect(
      mapListener({ protocol: 'amqp/ssl', port: 5671, node: 'n' }).isTls
    ).toBe(true);
    expect(mapListener({ protocol: 'amqp', port: 5672 }).isTls).toBe(false);
    expect(mapWebContext({ port: 15671, ssl: true }).isTls).toBe(true);
    expect(mapWebContext({ port: 15672 }).port).toBe('15672');
  });

  it('derives the channel mode', () => {
    expect(mapChannel({ confirm: true }).mode).toBe('confirm');
    expect(mapChannel({ transactional: true, confirm: true }).mode).toBe(
      'transactional'
    );
    expect(mapChannel({}).mode).toBe('normal');
  });

  it('reads tags as arrays or comma separated strings', () => {
    expect(asTagList(['a', 'b'])).toEqual(['a', 'b']);
    expect(asTagList('a, b,')).toEqual(['a', 'b']);
    expect(asTagList(undefined)).toEqual([]);
  });
});
