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

  it('lists users with tags and accessible vhosts', async () => {
    const snapshot = await post<{
      currentUser: { name: string; tags: string[] } | null;
      users: { name: string; tags: string[]; vhosts: string[] }[];
      unavailableReason: string | null;
    }>('/api/rabbitmq/users', {});

    expect(snapshot.unavailableReason).toBeNull();
    expect(snapshot.currentUser?.tags).toContain('administrator');
    expect(
      snapshot.users.find(user => user.name === 'orcaq_viewer')
    ).toMatchObject({
      tags: ['management'],
      vhosts: [vhost],
    });
  });

  it('returns user permissions and topic permissions', async () => {
    const detail = await post<{
      permissions: { vhost: string; configure: string; read: string }[];
      topicPermissions: { exchange: string; read: string }[];
    }>('/api/rabbitmq/user', { userName: 'orcaq_viewer' });

    expect(detail.permissions).toEqual([
      expect.objectContaining({ vhost, configure: '', read: '.*' }),
    ]);
    expect(detail.topicPermissions[0]).toMatchObject({
      exchange: 'events.topic',
      read: '^audit\\..*',
    });
  });

  it('explains when the user may not list users', async () => {
    const snapshot = await $fetch<{
      currentUser: { name: string } | null;
      unavailableReason: string | null;
    }>('/api/rabbitmq/users', {
      method: 'POST',
      body: {
        connection: rabbitConnection({
          username: 'orcaq_viewer',
          password: 'orcaq_viewer',
        }),
      },
    });

    expect(snapshot.currentUser?.name).toBe('orcaq_viewer');
    expect(snapshot.unavailableReason).toMatch(/administrator/);
  });

  it('exports definitions for the broker and for one vhost', async () => {
    const all = await post<{
      rabbitmq_definition_format: string;
      users: unknown[];
    }>('/api/rabbitmq/definitions-export', {});
    const single = await post<{
      rabbitmq_definition_format: string;
      queues: { name: string }[];
    }>('/api/rabbitmq/definitions-export', { vhost });

    expect(all.rabbitmq_definition_format).toBe('cluster');
    expect(all.users.length).toBeGreaterThanOrEqual(2);
    expect(single.rabbitmq_definition_format).toBe('single_virtual_host');
    expect(single.queues.map(queue => queue.name)).toContain('orders.created');
  });

  it('imports single-vhost definitions into the chosen vhost', async () => {
    const definitions = {
      rabbitmq_definition_format: 'single_virtual_host',
      queues: [
        {
          name: 'orcaq.imported',
          durable: true,
          auto_delete: false,
          arguments: { 'x-queue-type': 'classic' },
        },
      ],
      exchanges: [],
      bindings: [],
    };

    await expect(
      post('/api/rabbitmq/definitions-import', { definitions })
    ).rejects.toThrow();

    const result = await post<{ imported: boolean }>(
      '/api/rabbitmq/definitions-import',
      { definitions, vhost }
    );
    const queue = await post<{ name: string }>('/api/rabbitmq/queue', {
      vhost,
      queueName: 'orcaq.imported',
    });

    expect(result.imported).toBe(true);
    expect(queue.name).toBe('orcaq.imported');
  });

  it('creates a user with a vhost permission and refuses duplicates', async () => {
    const userName = `orcaq_created_${Date.now()}`;
    const managementUrl = `http://${rabbitFixture.host}:${rabbitFixture.managementPort}/api/users/${userName}`;
    const authorization = `Basic ${Buffer.from(
      `${rabbitFixture.username}:${rabbitFixture.password}`
    ).toString('base64')}`;

    try {
      const created = await post<{ created: boolean }>(
        '/api/rabbitmq/user-create',
        {
          name: userName,
          password: 'secret',
          tags: ['monitoring'],
          permission: { vhost, configure: '', write: '', read: '.*' },
        }
      );
      const detail = await post<{
        tags: string[];
        permissions: { vhost: string; read: string }[];
      }>('/api/rabbitmq/user', { userName });

      expect(created.created).toBe(true);
      expect(detail.tags).toEqual(['monitoring']);
      expect(detail.permissions).toEqual([
        expect.objectContaining({ vhost, read: '.*' }),
      ]);

      await expect(
        post('/api/rabbitmq/user-create', {
          name: userName,
          password: 'other',
          tags: [],
        })
      ).rejects.toThrow();
    } finally {
      await fetch(managementUrl, {
        method: 'DELETE',
        headers: { authorization },
      });
    }
  });

  it('refuses to create users without the administrator tag', async () => {
    await expect(
      $fetch('/api/rabbitmq/user-create', {
        method: 'POST',
        body: {
          connection: rabbitConnection({
            username: 'orcaq_viewer',
            password: 'orcaq_viewer',
          }),
          name: 'should_not_exist',
          password: 'x',
          tags: [],
        },
      })
    ).rejects.toThrow();
  });
});
