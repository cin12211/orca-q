import { describe, expect, it } from 'vitest';
import { EConnectionMethod } from '~/core/types/entities/connection.entity';
import { compareVersions } from '~/server/infrastructure/nosql/broker/broker-connection';
import { lagOf } from '~/server/infrastructure/nosql/kafka/kafka-offsets';
import { decodeRecordBatches } from '~/server/infrastructure/nosql/kafka/kafka-record';
import {
  buildKafkaOptions,
  resolveKafkaBrokers,
} from '~/server/infrastructure/nosql/kafka/kafka.client';
import {
  mapQueueSummary,
  mapRateSamples,
} from '~/server/infrastructure/nosql/rabbitmq/rabbitmq-mappers';
import { assertSupportedRabbitVersion } from '~/server/infrastructure/nosql/rabbitmq/rabbitmq-overview.service';

describe('compareVersions', () => {
  it('compares numerically, not as strings', () => {
    expect(compareVersions('3.12.0', '3.9.9')).toBeGreaterThan(0);
    expect(compareVersions('3.12', '3.12.0')).toBe(0);
    expect(compareVersions('3.11.28', '3.12.0')).toBeLessThan(0);
  });
});

describe('assertSupportedRabbitVersion', () => {
  it('rejects RabbitMQ older than 3.12', () => {
    expect(() => assertSupportedRabbitVersion('3.11.5')).toThrow(
      /not supported/
    );
    expect(() => assertSupportedRabbitVersion('')).toThrow(/not supported/);
    expect(() => assertSupportedRabbitVersion('4.1.0')).not.toThrow();
  });
});

describe('RabbitMQ mappers', () => {
  it('turns cumulative counters into per-second rates', () => {
    const rates = mapRateSamples({
      samples: [
        { sample: 130, timestamp: 20_000 },
        { sample: 100, timestamp: 10_000 },
      ],
    });

    expect(rates).toEqual([{ timestamp: 20_000, value: 3 }]);
  });

  it('maps a queue with missing stats to safe defaults', () => {
    const queue = mapQueueSummary({
      name: 'orders',
      vhost: '/',
      messages_ready: 4,
    });

    expect(queue.messagesReady).toBe(4);
    expect(queue.consumers).toBe(0);
    expect(queue.rates.publish).toBeNull();
    expect(queue.consumerUtilisation).toBeNull();
  });
});

describe('Kafka helpers', () => {
  it('prefers the configured broker list over host/port', () => {
    expect(
      resolveKafkaBrokers({
        method: EConnectionMethod.FORM,
        host: 'ignored',
        broker: { kafka: { brokers: [' a:9092 ', '', 'b:9092'] } },
      })
    ).toEqual(['a:9092', 'b:9092']);
  });

  it('refuses SSH tunnels for Kafka', () => {
    expect(() =>
      buildKafkaOptions({
        method: EConnectionMethod.FORM,
        broker: { kafka: { brokers: ['a:9092'] } },
        ssh: { enabled: true },
      })
    ).toThrow(/SSH tunnels are not supported/);
  });

  it('computes lag and ignores groups that never committed', () => {
    expect(lagOf(10n, 4n)).toBe(6);
    expect(lagOf(10n, -1n)).toBe(0);
    expect(lagOf(3n, 5n)).toBe(0);
  });

  it('decodes records after the requested offset only', () => {
    const decoded = decodeRecordBatches(
      [
        {
          firstOffset: 10n,
          firstTimestamp: 1_700_000_000_000n,
          records: [
            {
              offsetDelta: 0,
              timestampDelta: 0n,
              key: null,
              value: Buffer.from('a'),
              headers: [],
            },
            {
              offsetDelta: 1,
              timestampDelta: 5n,
              key: Buffer.from('k'),
              value: Buffer.from([0xff, 0xfe]),
              headers: [[Buffer.from('h'), Buffer.from('v')]],
            },
          ],
        } as never,
      ],
      { topic: 't', partition: 2, fromOffset: 11n }
    );

    expect(decoded).toHaveLength(1);
    expect(decoded[0].message).toMatchObject({
      offset: '11',
      partition: 2,
      key: 'k',
      payloadTransport: 'base64',
      headers: { h: 'v' },
    });
  });
});
