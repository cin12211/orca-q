import { describe, expect, it } from 'vitest';
import {
  parseBrokerList,
  parseKafkaConnectionString,
  parseRabbitConnectionString,
} from '~/components/modules/connection/utils';
import {
  decodeBrokerPayload,
  estimateDrainSeconds,
  formatSeconds,
  previewBrokerPayload,
} from '~/components/modules/shared/message-broker/utils';

describe('decodeBrokerPayload', () => {
  it('pretty-prints JSON payloads', () => {
    const decoded = decodeBrokerPayload({
      payload: '{"a":1}',
      payloadTransport: 'text',
    });

    expect(decoded.kind).toBe('json');
    expect(decoded.text).toBe('{\n  "a": 1\n}');
  });

  it('keeps invalid JSON as text and shows binary as hex', () => {
    expect(
      decodeBrokerPayload({ payload: '{oops', payloadTransport: 'text' }).kind
    ).toBe('text');
    expect(
      decodeBrokerPayload({ payload: 'AAH6', payloadTransport: 'base64' }).text
    ).toBe('00 01 fa');
  });

  it('builds a one-line preview', () => {
    expect(
      previewBrokerPayload({
        payload: '{\n "a": 1\n}',
        payloadTransport: 'text',
      })
    ).toBe('{"a":1}');
  });
});

describe('estimateDrainSeconds', () => {
  it('returns null when the backlog is not shrinking', () => {
    expect(
      estimateDrainSeconds({ backlog: 100, deliverRate: 5, publishRate: 10 })
    ).toBeNull();
  });

  it('divides the backlog by the net drain rate', () => {
    expect(
      estimateDrainSeconds({ backlog: 100, deliverRate: 15, publishRate: 5 })
    ).toBe(10);
    expect(formatSeconds(3700)).toBe('1h 1m');
  });
});

describe('parseBrokerList', () => {
  it('splits commas, spaces and new lines', () => {
    expect(parseBrokerList('a:9092, b:9092\nc:9092 ')).toEqual([
      'a:9092',
      'b:9092',
      'c:9092',
    ]);
  });
});

describe('broker connection strings', () => {
  it('reads RabbitMQ amqp URIs and targets the management port', () => {
    expect(
      parseRabbitConnectionString('amqp://orcaq:p%40ss@localhost:5672/orcaq')
    ).toEqual({
      host: 'localhost',
      port: '15672',
      username: 'orcaq',
      password: 'p@ss',
      useTls: false,
      broker: { rabbitmq: { vhost: 'orcaq' } },
    });

    const tls = parseRabbitConnectionString(
      'amqps://u:p@mq.example.com/%2F?management_port=443'
    );
    expect(tls).toMatchObject({ port: '443', useTls: true });
    expect(tls.broker.rabbitmq?.vhost).toBe('/');
  });

  it('reads Kafka URIs with several brokers, SASL and TLS', () => {
    expect(
      parseKafkaConnectionString(
        'kafka+ssl://user:secret@b1:9092,b2:9093?sasl=scram-sha-512'
      )
    ).toEqual({
      username: 'user',
      password: 'secret',
      useTls: true,
      broker: {
        kafka: {
          brokers: ['b1:9092', 'b2:9093'],
          saslMechanism: 'SCRAM-SHA-512',
        },
      },
    });

    expect(parseKafkaConnectionString('localhost:9092').broker.kafka).toEqual({
      brokers: ['localhost:9092'],
      saslMechanism: 'none',
    });
  });

  it('rejects unsupported Kafka values', () => {
    expect(() => parseKafkaConnectionString('http://x:1')).toThrow(
      /kafka:\/\//
    );
    expect(() => parseKafkaConnectionString('kafka://a:1?sasl=GSSAPI')).toThrow(
      /Unsupported sasl/
    );
  });
});
