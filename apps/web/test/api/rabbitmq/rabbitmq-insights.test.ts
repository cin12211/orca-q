import { $fetch, setup } from '@nuxt/test-utils/e2e';
import { afterAll, describe, expect, it } from 'vitest';
import { rabbitConnection, rabbitFixture } from '../support/broker-connection';

// Requires: bash scripts/test-services/start-fixtures.sh --profile rabbitmq
interface HttpFailure {
  statusCode?: number;
  data?: { message?: string };
}

const VIEWER = { username: 'orcaq_viewer', password: 'orcaq_viewer' };

describe('RabbitMQ API: instance insights', async () => {
  await setup();

  const vhost = rabbitFixture.vhost;
  const suffix = Date.now();
  const tempVhost = `orcaq-insights-${suffix}`;
  const managementApi = `http://${rabbitFixture.host}:${rabbitFixture.managementPort}/api`;
  const authorization = `Basic ${Buffer.from(
    `${rabbitFixture.username}:${rabbitFixture.password}`
  ).toString('base64')}`;

  const post = <T>(
    path: string,
    body: Record<string, unknown> = {},
    connection = rabbitConnection()
  ) => $fetch<T>(path, { method: 'POST', body: { connection, ...body } });

  const failureOf = async (request: Promise<unknown>) => {
    try {
      await request;
    } catch (error) {
      return error as HttpFailure;
    }
    throw new Error('Expected the request to fail.');
  };

  afterAll(async () => {
    await fetch(`${managementApi}/vhosts/${encodeURIComponent(tempVhost)}`, {
      method: 'DELETE',
      headers: { authorization },
    });
  });

  it('adds churn, ports, contexts and the current user to the overview', async () => {
    const overview = await post<{
      churn: Record<string, number | null>;
      listeners: { protocol: string; port: number }[];
      contexts: { port: string }[];
      currentUser: { name: string; tags: string[] };
      nodes: { cores: number | null; type: string }[];
      rates: Record<string, number | null>;
    }>('/api/rabbitmq/overview');

    expect(overview.churn).toHaveProperty('connectionCreated');
    expect(overview.listeners).toContainEqual(
      expect.objectContaining({ protocol: 'amqp', port: 5672 })
    );
    expect(overview.contexts.map(item => item.port)).toContain(
      String(rabbitFixture.managementPort)
    );
    expect(overview.currentUser).toMatchObject({
      name: rabbitFixture.username,
      tags: ['administrator'],
    });
    expect(overview.nodes[0]?.cores).toBeGreaterThan(0);
    expect(overview.rates).toHaveProperty('dropUnroutable');
  });

  it('lists virtual hosts with message counts', async () => {
    const vhosts = await post<
      { name: string; messages: number; defaultQueueType: string }[]
    >('/api/rabbitmq/vhost-list');

    expect(vhosts.find(item => item.name === vhost)).toMatchObject({
      defaultQueueType: 'classic',
    });
    expect(vhosts.find(item => item.name === vhost)?.messages).toBeGreaterThan(
      0
    );
  });

  it('creates, edits and deletes a virtual host', async () => {
    const input = {
      name: tempVhost,
      description: 'created by tests',
      tags: ['test'],
      defaultQueueType: 'quorum',
      isTracing: false,
    };

    await post('/api/rabbitmq/vhost-save', { vhost: input, isNew: true });
    const duplicate = await failureOf(
      post('/api/rabbitmq/vhost-save', { vhost: input, isNew: true })
    );
    expect(duplicate.data?.message).toMatch(/already exists/);

    await post('/api/rabbitmq/vhost-save', {
      vhost: { ...input, description: 'edited' },
      isNew: false,
    });
    const created = (
      await post<{ name: string; description: string; tags: string[] }[]>(
        '/api/rabbitmq/vhost-list'
      )
    ).find(item => item.name === tempVhost);
    expect(created).toMatchObject({ description: 'edited', tags: ['test'] });

    await post('/api/rabbitmq/vhost-delete', { vhost: tempVhost });
    const names = (
      await post<{ name: string }[]>('/api/rabbitmq/vhost-list')
    ).map(item => item.name);
    expect(names).not.toContain(tempVhost);
  });

  it('lists user and operator policies', async () => {
    const snapshot = await post<{
      policies: { kind: string; name: string; applyTo: string }[];
      unavailableReason: string | null;
    }>('/api/rabbitmq/policies');

    expect(snapshot.unavailableReason).toBeNull();
    expect(snapshot.policies).toContainEqual(
      expect.objectContaining({ kind: 'user', name: 'orders-max-length' })
    );
    expect(snapshot.policies).toContainEqual(
      expect.objectContaining({ kind: 'operator', name: 'cap-length' })
    );
  });

  it('saves, renames and deletes policies of both kinds', async () => {
    for (const kind of ['user', 'operator'] as const) {
      const name = `orcaq-test-${kind}-${suffix}`;
      const policy = {
        kind,
        vhost,
        name,
        pattern: '^tmp\\.',
        applyTo: 'queues',
        priority: 3,
        definition: { 'max-length': 10 },
      };

      await post('/api/rabbitmq/policy-save', { policy });
      await post('/api/rabbitmq/policy-save', {
        policy: { ...policy, name: `${name}-renamed` },
        previousName: name,
      });

      const listed = (
        await post<{ policies: { kind: string; name: string }[] }>(
          '/api/rabbitmq/policies'
        )
      ).policies
        .filter(item => item.kind === kind)
        .map(item => item.name);
      expect(listed).toContain(`${name}-renamed`);
      expect(listed).not.toContain(name);

      await post('/api/rabbitmq/policy-delete', {
        kind,
        vhost,
        name: `${name}-renamed`,
      });
    }
  });

  it('explains which tag is needed to change policies', async () => {
    const failure = await failureOf(
      post(
        '/api/rabbitmq/policy-save',
        {
          policy: {
            kind: 'user',
            vhost,
            name: 'should-not-exist',
            pattern: '.*',
            applyTo: 'all',
            priority: 0,
            definition: {},
          },
        },
        rabbitConnection(VIEWER)
      )
    );

    expect(failure.statusCode).toBe(502);
    expect(failure.data?.message).toMatch(/policymaker/);
  });

  it('lists, sets and clears limits', async () => {
    const before = await post<{
      vhostLimits: { target: string; limits: Record<string, number> }[];
      userLimits: { target: string; limits: Record<string, number> }[];
    }>('/api/rabbitmq/limits');

    expect(before.vhostLimits).toContainEqual({
      target: vhost,
      limits: { 'max-connections': 500 },
    });
    expect(before.userLimits).toContainEqual({
      target: 'orcaq_viewer',
      limits: { 'max-channels': 50 },
    });

    await post('/api/rabbitmq/vhost-limit-set', {
      vhost,
      limit: { name: 'max-queues', value: 1000 },
    });
    const withQueues = await post<{
      vhostLimits: { target: string; limits: Record<string, number> }[];
    }>('/api/rabbitmq/limits');
    expect(
      withQueues.vhostLimits.find(row => row.target === vhost)?.limits
    ).toEqual({ 'max-connections': 500, 'max-queues': 1000 });

    await post('/api/rabbitmq/vhost-limit-clear', {
      vhost,
      limitName: 'max-queues',
    });
    const after = await post<{
      vhostLimits: { target: string; limits: Record<string, number> }[];
    }>('/api/rabbitmq/limits');
    expect(after.vhostLimits.find(row => row.target === vhost)?.limits).toEqual(
      { 'max-connections': 500 }
    );
  });

  it('lists feature flags and deprecated features', async () => {
    const snapshot = await post<{
      flags: { name: string; state: string; stability: string }[];
      deprecated: { name: string; phase: string; isUsed: boolean }[];
    }>('/api/rabbitmq/feature-flags');

    expect(snapshot.flags.length).toBeGreaterThan(0);
    expect(snapshot.flags[0]).toHaveProperty('stability');
    expect(snapshot.deprecated.length).toBeGreaterThan(0);
  });

  it('enabling an already enabled feature flag is harmless', async () => {
    const { flags } = await post<{
      flags: { name: string; state: string }[];
    }>('/api/rabbitmq/feature-flags');
    const enabled = flags.find(flag => flag.state === 'enabled');

    const result = await post<{ enabled: boolean }>(
      '/api/rabbitmq/feature-flag-enable',
      { name: enabled?.name }
    );
    expect(result.enabled).toBe(true);
  });

  it('renames the cluster and back', async () => {
    const { clusterName } = await post<{ clusterName: string }>(
      '/api/rabbitmq/overview'
    );

    try {
      await post('/api/rabbitmq/cluster-name', { name: `orcaq-${suffix}` });
      const renamed = await post<{ clusterName: string }>(
        '/api/rabbitmq/overview'
      );
      expect(renamed.clusterName).toBe(`orcaq-${suffix}`);
    } finally {
      await post('/api/rabbitmq/cluster-name', { name: clusterName });
    }
  });

  it('answers 404 for a connection that is gone', async () => {
    const name = '127.0.0.1:1 -> 127.0.0.1:5672';

    expect(
      (
        await failureOf(
          post('/api/rabbitmq/connection', { connectionName: name })
        )
      ).statusCode
    ).toBe(404);
    expect(
      (
        await failureOf(
          post('/api/rabbitmq/connection-close', {
            connectionName: name,
            reason: 'test',
          })
        )
      ).statusCode
    ).toBe(404);
  });

  it('refuses admin changes from a management-only user', async () => {
    const viewer = rabbitConnection(VIEWER);
    const attempts = [
      () =>
        post(
          '/api/rabbitmq/vhost-save',
          {
            vhost: {
              name: 'nope',
              description: '',
              tags: [],
              defaultQueueType: 'classic',
              isTracing: false,
            },
            isNew: true,
          },
          viewer
        ),
      () =>
        post(
          '/api/rabbitmq/vhost-limit-set',
          { vhost, limit: { name: 'max-queues', value: 1 } },
          viewer
        ),
      () => post('/api/rabbitmq/cluster-name', { name: 'nope' }, viewer),
      () => post('/api/rabbitmq/limits', {}, viewer),
    ];

    for (const attempt of attempts) {
      const failure = await failureOf(attempt());
      expect(failure.statusCode).toBe(502);
      expect(failure.data?.message).toMatch(/administrator/);
    }
  });

  it('rejects invalid insight requests with 400', async () => {
    const invalid: [string, Record<string, unknown>][] = [
      [
        '/api/rabbitmq/vhost-save',
        {
          vhost: {
            name: 'x',
            description: '',
            tags: [],
            defaultQueueType: 'lazy',
            isTracing: false,
          },
          isNew: true,
        },
      ],
      ['/api/rabbitmq/vhost-delete', { vhost: '' }],
      [
        '/api/rabbitmq/policy-save',
        {
          policy: {
            kind: 'global',
            vhost,
            name: 'x',
            pattern: '.*',
            applyTo: 'all',
            priority: 0,
            definition: {},
          },
        },
      ],
      [
        '/api/rabbitmq/vhost-limit-set',
        { vhost, limit: { name: 'max-channels', value: 1 } },
      ],
      ['/api/rabbitmq/connection-close', { connectionName: 'x', reason: '' }],
      ['/api/rabbitmq/cluster-name', { name: '  ' }],
    ];

    for (const [path, body] of invalid) {
      const failure = await failureOf(post(path, body));
      expect(failure.statusCode, `${path} ${JSON.stringify(body)}`).toBe(400);
    }
  });
});
