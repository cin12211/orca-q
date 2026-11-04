import { $fetch, setup } from '@nuxt/test-utils/e2e';
import { describe, expect, it } from 'vitest';
import { kafkaConnection } from '../support/broker-connection';

// Requires: bash scripts/test-services/start-fixtures.sh --profile kafka
const ORDERS_TOPIC = 'orcaq.orders';

interface HttpFailure {
  statusCode?: number;
  data?: { message?: string; hint?: string };
}

describe('Kafka API: errors and request validation', async () => {
  await setup();

  const post = <T>(path: string, body: Record<string, unknown> = {}) =>
    $fetch<T>(path, {
      method: 'POST',
      body: { connection: kafkaConnection(), ...body },
    });

  /** Resolve the failed request's status and error body. */
  const failureOf = async (request: Promise<unknown>) => {
    try {
      await request;
    } catch (error) {
      return error as HttpFailure;
    }
    throw new Error('Expected the request to fail.');
  };

  it('names a topic that does not exist', async () => {
    const topic = `orcaq.ghost.${Date.now()}`;
    const failure = await failureOf(post('/api/kafka/topic', { topic }));

    expect(failure.statusCode).toBe(502);
    expect(failure.data?.message).toBe(`Topic "${topic}" was not found.`);
  });

  it('names a missing topic when reading or tailing messages', async () => {
    const topic = `orcaq.ghost.${Date.now()}`;
    const read = await failureOf(
      post('/api/kafka/messages', { topic, start: 'earliest' })
    );
    const live = await failureOf(post('/api/kafka/live/start', { topic }));

    for (const failure of [read, live]) {
      expect(failure.statusCode).toBe(502);
      expect(failure.data?.message).toBe(`Topic "${topic}" was not found.`);
    }
  });

  it('names a consumer group that does not exist', async () => {
    const groupId = `orcaq-ghost-${Date.now()}`;
    const failure = await failureOf(post('/api/kafka/group', { groupId }));

    expect(failure.statusCode).toBe(502);
    expect(failure.data?.message).toBe(
      `Consumer group "${groupId}" was not found.`
    );
  });

  it('rejects an offset that is not a number', async () => {
    const failure = await failureOf(
      post('/api/kafka/messages', {
        topic: ORDERS_TOPIC,
        start: 'offset',
        offset: 'abc',
      })
    );

    expect(failure.statusCode).toBe(502);
    expect(failure.data?.message).toBe('"abc" is not a valid offset.');
  });

  it('rejects invalid message queries with 400', async () => {
    const invalidBodies = [
      { topic: '', start: 'earliest' },
      { topic: ORDERS_TOPIC, start: 'middle' },
      { topic: ORDERS_TOPIC, start: 'earliest', limit: 0 },
      { topic: ORDERS_TOPIC, start: 'earliest', partitions: [-1] },
    ];

    for (const body of invalidBodies) {
      const failure = await failureOf(post('/api/kafka/messages', body));
      expect(failure.statusCode, JSON.stringify(body)).toBe(400);
    }
  });

  it('rejects produce bodies without a value or with non-string headers', async () => {
    for (const body of [
      { topic: ORDERS_TOPIC },
      { topic: ORDERS_TOPIC, value: '{}', headers: { retry: 2 } },
    ]) {
      const failure = await failureOf(post('/api/kafka/produce', body));
      expect(failure.statusCode, JSON.stringify(body)).toBe(400);
    }
  });

  it('asks for a bootstrap server when none is configured', async () => {
    const failure = await failureOf(
      $fetch('/api/kafka/topics', {
        method: 'POST',
        body: {
          connection: kafkaConnection({ broker: { kafka: { brokers: [] } } }),
        },
      })
    );

    expect(failure.statusCode).toBe(502);
    expect(failure.data?.message).toMatch(/bootstrap server/);
  });

  it('refuses SSH tunnels', async () => {
    const failure = await failureOf(
      $fetch('/api/kafka/topics', {
        method: 'POST',
        body: {
          connection: kafkaConnection({
            ssh: {
              enabled: true,
              host: 'bastion',
              port: 22,
              username: 'orcaq',
            },
          }),
        },
      })
    );

    expect(failure.data?.message).toMatch(/SSH tunnels are not supported/);
  });

  it('reports a stopped live view instead of failing', async () => {
    const result = await $fetch<{ isRunning: boolean; error: string }>(
      '/api/kafka/live/poll',
      { method: 'POST', body: { sessionId: 'unknown-session' } }
    );
    const stopped = await $fetch<{ stopped: boolean }>('/api/kafka/live/stop', {
      method: 'POST',
      body: { sessionId: 'unknown-session' },
    });

    expect(result.isRunning).toBe(false);
    expect(result.error).toMatch(/stopped/);
    expect(stopped.stopped).toBe(false);
  });
});
