import { $fetch, setup } from '@nuxt/test-utils/e2e';
import { describe, expect, it } from 'vitest';
import { rabbitConnection, rabbitFixture } from '../support/broker-connection';

// Requires: bash scripts/test-services/start-fixtures.sh --profile rabbitmq
describe('RabbitMQ API', async () => {
  await setup();

  const vhost = rabbitFixture.vhost;
  const post = <T>(path: string, body: Record<string, unknown>) =>
    $fetch<T>(path, {
      method: 'POST',
      body: { connection: rabbitConnection(), ...body },
    });

  it('passes the health check', async () => {
    const result = await $fetch<{ isConnectedSuccess: boolean }>(
      '/api/managment-connection/health-check',
      {
        method: 'POST',
        body: { type: 'rabbitmq', ...rabbitConnection() },
      }
    );

    expect(result.isConnectedSuccess).toBe(true);
  });

  it('reports a readable error for a wrong password', async () => {
    const result = await $fetch<{
      isConnectedSuccess: boolean;
      message?: string;
    }>('/api/managment-connection/health-check', {
      method: 'POST',
      body: { type: 'rabbitmq', ...rabbitConnection({ password: 'wrong' }) },
    });

    expect(result.isConnectedSuccess).toBe(false);
    expect(result.message).toMatch(/Authentication failed/);
  });

  it('reports the missing management plugin on a closed port', async () => {
    const result = await $fetch<{ isConnectedSuccess: boolean; hint?: string }>(
      '/api/managment-connection/health-check',
      {
        method: 'POST',
        body: { type: 'rabbitmq', ...rabbitConnection({ port: '1' }) },
      }
    );

    expect(result.isConnectedSuccess).toBe(false);
    expect(result.hint).toMatch(/rabbitmq_management/);
  });

  it('returns the overview with vhosts and nodes', async () => {
    const overview = await post<{
      version: string;
      vhosts: string[];
      nodes: unknown[];
      totals: { queues: number };
    }>('/api/rabbitmq/overview', {});

    expect(overview.version).toMatch(/^\d+\.\d+/);
    expect(overview.vhosts).toContain(vhost);
    expect(overview.nodes.length).toBeGreaterThan(0);
    expect(overview.totals.queues).toBeGreaterThanOrEqual(4);
  });

  it('explains missing node access for a management-only user', async () => {
    const overview = await $fetch<{ nodesUnavailableReason: string | null }>(
      '/api/rabbitmq/overview',
      {
        method: 'POST',
        body: {
          connection: rabbitConnection({
            username: 'orcaq_viewer',
            password: 'orcaq_viewer',
          }),
        },
      }
    );

    expect(overview.nodesUnavailableReason).toMatch(/monitoring/);
  });

  it('lists queues with counts and paging', async () => {
    const page = await post<{
      items: { name: string; messagesReady: number; consumers: number }[];
      totalCount: number;
    }>('/api/rabbitmq/queues', { vhost, pageSize: 2 });

    expect(page.items).toHaveLength(2);
    expect(page.totalCount).toBeGreaterThanOrEqual(4);

    const search = await post<{
      items: { name: string; messagesReady: number }[];
    }>('/api/rabbitmq/queues', { vhost, search: 'backlog' });
    expect(search.items[0]?.name).toBe('backlog.no-consumer');
    expect(search.items[0]?.messagesReady).toBe(26);
  });

  it('returns queue detail with arguments and bindings', async () => {
    const queue = await post<{
      arguments: Record<string, unknown>;
      bindings: { source: string }[];
      messagesReady: number;
    }>('/api/rabbitmq/queue', { vhost, queueName: 'orders.created' });

    expect(queue.arguments['x-dead-letter-exchange']).toBe('orders.dlx');
    expect(queue.bindings.map(binding => binding.source)).toContain(
      'orders.direct'
    );
  });

  it('peeks messages without removing them', async () => {
    const before = await post<{ messagesReady: number }>(
      '/api/rabbitmq/queue',
      { vhost, queueName: 'orders.created' }
    );
    const messages = await post<
      {
        payload: string;
        payloadTransport: string;
        headers: Record<string, string>;
      }[]
    >('/api/rabbitmq/peek', { vhost, queueName: 'orders.created', count: 3 });

    expect(messages).toHaveLength(3);
    expect(JSON.parse(messages[0].payload)).toHaveProperty('orderId');
    expect(messages[0].headers.source).toBe('fixture');

    // Management stats refresh every few seconds; poll until they settle.
    let after = before.messagesReady;
    for (let attempt = 0; attempt < 10; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      after = (
        await post<{ messagesReady: number }>('/api/rabbitmq/queue', {
          vhost,
          queueName: 'orders.created',
        })
      ).messagesReady;
      if (after === before.messagesReady) break;
    }
    expect(after).toBe(before.messagesReady);
  });

  it('returns binary payloads as base64', async () => {
    const messages = await post<{ payloadTransport: string }[]>(
      '/api/rabbitmq/peek',
      { vhost, queueName: 'backlog.no-consumer', count: 50 }
    );

    expect(
      messages.some(message => message.payloadTransport === 'base64')
    ).toBe(true);
  });

  it('lists exchanges and exchange bindings', async () => {
    const exchanges = await post<{ name: string; type: string }[]>(
      '/api/rabbitmq/exchanges',
      { vhost }
    );
    expect(exchanges.find(item => item.name === 'events.topic')?.type).toBe(
      'topic'
    );

    const detail = await post<{ bindingsAsSource: { destination: string }[] }>(
      '/api/rabbitmq/exchange',
      { vhost, exchangeName: 'events.topic' }
    );
    expect(detail.bindingsAsSource[0]?.destination).toBe('events.audit');
  });

  it('publishes a test message and reports routing', async () => {
    const routed = await post<{ isRouted: boolean }>('/api/rabbitmq/publish', {
      vhost,
      exchange: 'events.topic',
      routingKey: 'audit.test',
      payload: '{"from":"test"}',
      contentType: 'application/json',
    });
    const unrouted = await post<{ isRouted: boolean }>(
      '/api/rabbitmq/publish',
      {
        vhost,
        exchange: 'events.topic',
        routingKey: 'nobody.listens',
        payload: 'x',
      }
    );

    expect(routed.isRouted).toBe(true);
    expect(unrouted.isRouted).toBe(false);
  });

  it('lists connections and channels', async () => {
    const snapshot = await post<{
      connections: unknown[];
      channels: unknown[];
    }>('/api/rabbitmq/connections', {});

    expect(Array.isArray(snapshot.connections)).toBe(true);
    expect(Array.isArray(snapshot.channels)).toBe(true);
  });
});
