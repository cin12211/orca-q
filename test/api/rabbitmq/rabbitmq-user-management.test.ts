import { $fetch, setup } from '@nuxt/test-utils/e2e';
import { afterAll, describe, expect, it } from 'vitest';
import { rabbitConnection, rabbitFixture } from '../support/broker-connection';

// Requires: bash scripts/test-services/start-fixtures.sh --profile rabbitmq
interface HttpFailure {
  statusCode?: number;
  data?: { message?: string };
}

interface UserDetail {
  tags: string[];
  hasPassword: boolean;
  limits: Record<string, number>;
  permissions: { vhost: string; configure: string; read: string }[];
  topicPermissions: { exchange: string; write: string; read: string }[];
  currentUser: { name: string };
}

const VIEWER = { username: 'orcaq_viewer', password: 'orcaq_viewer' };

describe('RabbitMQ API: managing users', async () => {
  await setup();

  const vhost = rabbitFixture.vhost;
  const suffix = Date.now();
  const createdUsers: string[] = [];
  const managementApi = `http://${rabbitFixture.host}:${rabbitFixture.managementPort}/api`;
  const authorization = `Basic ${Buffer.from(
    `${rabbitFixture.username}:${rabbitFixture.password}`
  ).toString('base64')}`;

  const post = <T>(
    path: string,
    body: Record<string, unknown>,
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

  const createUser = async (tags: string[] = ['management']) => {
    const name = `orcaq_managed_${suffix}_${createdUsers.length}`;
    createdUsers.push(name);
    await post('/api/rabbitmq/user-create', {
      name,
      password: 'first-password',
      tags,
      permission: { vhost, configure: '', write: '', read: '.*' },
    });
    return name;
  };

  const detailOf = (userName: string) =>
    post<UserDetail>('/api/rabbitmq/user', { userName });

  /** Whether the user can reach the Management API with this password. */
  const canLogIn = async (username: string, password: string) => {
    const snapshot = await post<{ currentUser: { name: string } | null }>(
      '/api/rabbitmq/users',
      {},
      rabbitConnection({ username, password })
    ).catch(() => null);
    return snapshot?.currentUser?.name === username;
  };

  afterAll(async () => {
    for (const name of createdUsers) {
      await fetch(`${managementApi}/users/${encodeURIComponent(name)}`, {
        method: 'DELETE',
        headers: { authorization },
      });
    }
  });

  it('returns the connected user with the user detail', async () => {
    const detail = await detailOf('orcaq_viewer');

    expect(detail.currentUser.name).toBe(rabbitFixture.username);
  });

  it('changes tags and keeps the password when none is given', async () => {
    const name = await createUser();

    await post('/api/rabbitmq/user-update', {
      name,
      tags: ['monitoring'],
    });

    expect((await detailOf(name)).tags).toEqual(['monitoring']);
    expect(await canLogIn(name, 'first-password')).toBe(true);
  });

  it('sets a new password or removes it', async () => {
    const name = await createUser();

    await post('/api/rabbitmq/user-update', {
      name,
      tags: ['management'],
      password: 'second-password',
    });
    expect(await canLogIn(name, 'first-password')).toBe(false);
    expect(await canLogIn(name, 'second-password')).toBe(true);

    await post('/api/rabbitmq/user-update', {
      name,
      tags: ['management'],
      shouldRemovePassword: true,
    });
    expect((await detailOf(name)).hasPassword).toBe(false);
    expect(await canLogIn(name, 'second-password')).toBe(false);
  });

  it('refuses to remove administrator from the connected user', async () => {
    const failure = await failureOf(
      post('/api/rabbitmq/user-update', {
        name: rabbitFixture.username,
        tags: ['management'],
      })
    );

    expect(failure.statusCode).toBe(502);
    expect(failure.data?.message).toMatch(/connected as/);
    expect((await detailOf(rabbitFixture.username)).tags).toContain(
      'administrator'
    );
  });

  it('sets, updates and clears a vhost permission', async () => {
    const name = await createUser();

    await post('/api/rabbitmq/user-permission-set', {
      userName: name,
      permission: { vhost: '/', configure: '^tmp\\.', write: '.*', read: '' },
    });
    expect((await detailOf(name)).permissions).toEqual([
      expect.objectContaining({ vhost: '/', configure: '^tmp\\.', read: '' }),
      expect.objectContaining({ vhost }),
    ]);

    await post('/api/rabbitmq/user-permission-clear', {
      userName: name,
      vhost: '/',
    });
    expect((await detailOf(name)).permissions.map(item => item.vhost)).toEqual([
      vhost,
    ]);
  });

  it('clears one topic permission and keeps the others on the vhost', async () => {
    const name = await createUser();

    for (const exchange of ['events.topic', 'amq.topic']) {
      await post('/api/rabbitmq/user-topic-permission-set', {
        userName: name,
        permission: { vhost, exchange, write: '', read: '^audit\\.' },
      });
    }

    await post('/api/rabbitmq/user-topic-permission-clear', {
      userName: name,
      vhost,
      exchange: 'events.topic',
    });

    expect((await detailOf(name)).topicPermissions).toEqual([
      expect.objectContaining({ exchange: 'amq.topic', read: '^audit\\.' }),
    ]);
  });

  it('sets and clears user limits', async () => {
    const name = await createUser();

    await post('/api/rabbitmq/user-limit-set', {
      userName: name,
      limit: { name: 'max-connections', value: 3 },
    });
    expect((await detailOf(name)).limits).toEqual({ 'max-connections': 3 });

    await post('/api/rabbitmq/user-limit-clear', {
      userName: name,
      limitName: 'max-connections',
    });
    expect((await detailOf(name)).limits).toEqual({});
  });

  it('deletes a user but never the connected one', async () => {
    const name = await createUser();

    await post('/api/rabbitmq/user-delete', { userName: name });
    expect((await failureOf(detailOf(name))).statusCode).toBe(404);

    const self = await failureOf(
      post('/api/rabbitmq/user-delete', { userName: rabbitFixture.username })
    );
    expect(self.data?.message).toMatch(/connected as/);
  });

  it('explains that changes need the administrator tag', async () => {
    const viewer = rabbitConnection(VIEWER);
    const attempts = [
      () =>
        post(
          '/api/rabbitmq/user-update',
          { name: 'orcaq_viewer', tags: [] },
          viewer
        ),
      () => post('/api/rabbitmq/user-delete', { userName: 'orcaq' }, viewer),
      () =>
        post(
          '/api/rabbitmq/user-limit-set',
          {
            userName: 'orcaq_viewer',
            limit: { name: 'max-channels', value: 1 },
          },
          viewer
        ),
    ];

    for (const attempt of attempts) {
      const failure = await failureOf(attempt());
      expect(failure.statusCode).toBe(502);
      expect(failure.data?.message).toMatch(/administrator/);
    }
  });

  it('rejects invalid change requests with 400', async () => {
    const invalid: [string, Record<string, unknown>][] = [
      ['/api/rabbitmq/user-update', { name: 'x', tags: 'administrator' }],
      ['/api/rabbitmq/user-update', { name: 'x', tags: [], password: '' }],
      [
        '/api/rabbitmq/user-permission-set',
        { userName: 'x', permission: { vhost: '' } },
      ],
      [
        '/api/rabbitmq/user-limit-set',
        { userName: 'x', limit: { name: 'max-queues', value: 1 } },
      ],
      [
        '/api/rabbitmq/user-limit-set',
        { userName: 'x', limit: { name: 'max-channels', value: 1.5 } },
      ],
      ['/api/rabbitmq/user-topic-permission-clear', { userName: 'x', vhost }],
      ['/api/rabbitmq/user-delete', { userName: '' }],
    ];

    for (const [path, body] of invalid) {
      const failure = await failureOf(post(path, body));
      expect(failure.statusCode, `${path} ${JSON.stringify(body)}`).toBe(400);
    }
  });
});
