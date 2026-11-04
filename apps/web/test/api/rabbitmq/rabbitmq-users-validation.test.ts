import { $fetch, setup } from '@nuxt/test-utils/e2e';
import { describe, expect, it } from 'vitest';
import { rabbitConnection, rabbitFixture } from '../support/broker-connection';

// Requires: bash scripts/test-services/start-fixtures.sh --profile rabbitmq
interface HttpFailure {
  statusCode?: number;
  data?: { message?: string; hint?: string };
}

const VIEWER = { username: 'orcaq_viewer', password: 'orcaq_viewer' };

describe('RabbitMQ API: users, definitions and request validation', async () => {
  await setup();

  const vhost = rabbitFixture.vhost;
  const managementApi = `http://${rabbitFixture.host}:${rabbitFixture.managementPort}/api`;
  const authorization = `Basic ${Buffer.from(
    `${rabbitFixture.username}:${rabbitFixture.password}`
  ).toString('base64')}`;

  const post = <T>(
    path: string,
    body: Record<string, unknown>,
    connection = rabbitConnection()
  ) => $fetch<T>(path, { method: 'POST', body: { connection, ...body } });

  /** Resolve the failed request's status and error body. */
  const failureOf = async (request: Promise<unknown>) => {
    try {
      await request;
    } catch (error) {
      return error as HttpFailure;
    }
    throw new Error('Expected the request to fail.');
  };

  const deleteUser = (name: string) =>
    fetch(`${managementApi}/users/${encodeURIComponent(name)}`, {
      method: 'DELETE',
      headers: { authorization },
    });

  it('lists vhosts for the connected user', async () => {
    const vhosts = await post<string[]>('/api/rabbitmq/vhosts', {});

    expect(vhosts).toContain(vhost);
  });

  it('reports password logins and limits for each user', async () => {
    const snapshot = await post<{
      users: { name: string; hasPassword: boolean; limits: object }[];
    }>('/api/rabbitmq/users', {});
    const names = snapshot.users.map(user => user.name);

    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    expect(
      snapshot.users.find(user => user.name === rabbitFixture.username)
    ).toMatchObject({ hasPassword: true, limits: {} });
  });

  it('returns user detail with sorted vhost permissions', async () => {
    const detail = await post<{
      name: string;
      tags: string[];
      vhosts: string[];
      permissions: { vhost: string }[];
    }>('/api/rabbitmq/user', { userName: rabbitFixture.username });

    expect(detail.name).toBe(rabbitFixture.username);
    expect(detail.tags).toContain('administrator');
    expect(detail.vhosts).toContain(vhost);
    expect(detail.permissions.map(item => item.vhost)).toEqual(
      [...detail.vhosts].sort((a, b) => a.localeCompare(b))
    );
  });

  it('answers 404 for a user that does not exist', async () => {
    const failure = await failureOf(
      post('/api/rabbitmq/user', { userName: `ghost_${Date.now()}` })
    );

    expect(failure.statusCode).toBe(404);
  });

  it('explains missing access when a non-admin opens a user', async () => {
    const failure = await failureOf(
      post(
        '/api/rabbitmq/user',
        { userName: rabbitFixture.username },
        rabbitConnection(VIEWER)
      )
    );

    expect(failure.statusCode).toBe(502);
    expect(failure.data?.message).toMatch(/administrator/);
  });

  it('creates a user without permissions and with no tags', async () => {
    const userName = `orcaq_plain_${Date.now()}`;

    try {
      await post('/api/rabbitmq/user-create', {
        name: userName,
        password: 'secret',
        tags: [],
      });
      const detail = await post<{
        tags: string[];
        hasPassword: boolean;
        permissions: unknown[];
        vhosts: string[];
      }>('/api/rabbitmq/user', { userName });

      expect(detail).toMatchObject({
        tags: [],
        hasPassword: true,
        permissions: [],
        vhosts: [],
      });
    } finally {
      await deleteUser(userName);
    }
  });

  it('tells which user already exists', async () => {
    const failure = await failureOf(
      post('/api/rabbitmq/user-create', {
        name: 'orcaq_viewer',
        password: 'other',
        tags: [],
      })
    );

    expect(failure.statusCode).toBe(502);
    expect(failure.data?.message).toBe('User "orcaq_viewer" already exists.');
  });

  it('rejects invalid create-user bodies with 400', async () => {
    const invalidBodies = [
      { name: '   ', password: 'secret', tags: [] },
      { name: 'orcaq_no_password', password: '', tags: [] },
      { name: 'orcaq_bad_tags', password: 'secret', tags: 'administrator' },
      {
        name: 'orcaq_bad_permission',
        password: 'secret',
        tags: [],
        permission: { vhost },
      },
    ];

    for (const body of invalidBodies) {
      const failure = await failureOf(post('/api/rabbitmq/user-create', body));
      expect(failure.statusCode, JSON.stringify(body)).toBe(400);
    }
  });

  it('rejects requests without a valid connection', async () => {
    const failure = await failureOf(
      $fetch('/api/rabbitmq/users', {
        method: 'POST',
        body: { connection: { method: 'telepathy' } },
      })
    );

    expect(failure.statusCode).toBe(400);
  });

  it('rejects definitions that are not a JSON object', async () => {
    const failure = await failureOf(
      post('/api/rabbitmq/definitions-import', { definitions: ['queues'] })
    );

    expect(failure.statusCode).toBe(400);
  });

  it('refuses definition imports from a non-admin user', async () => {
    const failure = await failureOf(
      post(
        '/api/rabbitmq/definitions-import',
        {
          definitions: {
            rabbitmq_definition_format: 'single_virtual_host',
            queues: [],
          },
          vhost,
        },
        rabbitConnection(VIEWER)
      )
    );

    expect(failure.statusCode).toBe(502);
  });

  it('exports definitions that round-trip through import', async () => {
    const exported = await post<Record<string, unknown>>(
      '/api/rabbitmq/definitions-export',
      { vhost }
    );
    const result = await post<{ imported: boolean }>(
      '/api/rabbitmq/definitions-import',
      { definitions: exported, vhost }
    );

    expect(result.imported).toBe(true);
  });
});
