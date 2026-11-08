import { setup, url } from '@nuxt/test-utils/e2e';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import knex from 'knex';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import {
  kafkaConnection,
  rabbitConnection,
  rabbitFixture,
} from '../support/broker-connection';

// Requires: bash scripts/test-services/start-fixtures.sh --profile rabbitmq
//       and bash scripts/test-services/start-fixtures.sh --profile kafka
const TOKEN = 'orcaq_mcp-broker-test';
const RABBIT_ID = 'conn-rabbit';
const KAFKA_ID = 'conn-kafka';
const BACKLOG_QUEUE = 'backlog.no-consumer';
const ORDERS_TOPIC = 'orcaq.orders';
const GROUP_ID = 'orcaq-fixture-group';

const tempDir = mkdtempSync(path.join(tmpdir(), 'orcaq-mcp-broker-'));
const persistDbPath = path.join(tempDir, 'orcaq.db');

function toConnectionRow(
  id: string,
  type: string,
  connection: Record<string, unknown>
) {
  const { broker, ssl, ssh, ...fields } = connection;
  return {
    id,
    workspace_id: 'ws-brokers',
    name: id,
    type,
    ...fields,
    broker: JSON.stringify(broker),
    ssl: ssl ? JSON.stringify(ssl) : null,
    ssh: ssh ? JSON.stringify(ssh) : null,
    created_at: id,
  };
}

/** The desktop data store the MCP route reads sessions and connections from. */
async function seedPersistDb() {
  const db = knex({
    client: 'sqlite3',
    connection: { filename: persistDbPath },
    useNullAsDefault: true,
  });
  await db.raw('CREATE TABLE app_config (id TEXT PRIMARY KEY, data TEXT)');
  await db.raw('CREATE TABLE workspaces (id TEXT PRIMARY KEY, name TEXT)');
  await db.raw(`CREATE TABLE connections (
    id TEXT PRIMARY KEY, workspace_id TEXT, name TEXT, type TEXT, method TEXT,
    provider_kind TEXT, connection_string TEXT, host TEXT, port TEXT,
    username TEXT, password TEXT, database TEXT, service_name TEXT,
    file_path TEXT, managed_sqlite TEXT, broker TEXT, ssl TEXT, ssh TEXT,
    tag_ids TEXT, created_at TEXT, updated_at TEXT)`);
  await db.raw(`CREATE TABLE mcp_sessions (
    id TEXT PRIMARY KEY, name TEXT, token TEXT, require_token INTEGER,
    workspace_access TEXT, connection_access TEXT, created_at TEXT,
    updated_at TEXT)`);
  await db('app_config').insert({
    id: 'app-config',
    data: JSON.stringify({ mcpServerConfigs: { enabled: true } }),
  });
  await db('workspaces').insert({ id: 'ws-brokers', name: 'Brokers' });
  await db('connections').insert([
    toConnectionRow(RABBIT_ID, 'rabbitmq', rabbitConnection()),
    toConnectionRow(KAFKA_ID, 'kafka', kafkaConnection()),
  ]);
  await db('mcp_sessions').insert({
    id: 'session-brokers',
    name: 'Broker test',
    token: TOKEN,
    require_token: 1,
    workspace_access: JSON.stringify({ 'ws-brokers': 'read' }),
    connection_access: JSON.stringify({}),
    created_at: '2026-10-29',
  });
  await db.destroy();
}

await seedPersistDb();

describe('MCP API: RabbitMQ and Kafka tools', async () => {
  await setup({
    env: { ORCAQ_DESKTOP_RUNTIME: '1', ORCAQ_PERSIST_DB_PATH: persistDbPath },
  });

  afterAll(() => rmSync(tempDir, { recursive: true, force: true }));

  async function callTool(name: string, args: Record<string, unknown> = {}) {
    const client = new Client({ name: 'orcaq-test', version: '1.0.0' });
    await client.connect(
      new StreamableHTTPClientTransport(new URL(url('/mcp')), {
        requestInit: { headers: { Authorization: `Bearer ${TOKEN}` } },
      })
    );

    try {
      const result = await client.callTool({ name, arguments: args });
      const text = (result.content as { text: string }[])[0]?.text ?? '';
      return { isError: Boolean(result.isError), text };
    } finally {
      await client.close();
    }
  }

  const callJson = async <T>(name: string, args: Record<string, unknown>) => {
    const { isError, text } = await callTool(name, args);
    expect(isError, text).toBe(false);
    return JSON.parse(text) as T;
  };

  it('lists broker connections with their family', async () => {
    const connections = await callJson<
      { id: string; family: string; supported: boolean }[]
    >('list_connections', {});

    expect(connections).toHaveLength(2);
    expect(connections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: RABBIT_ID,
          family: 'rabbitmq',
          supported: true,
        }),
        expect.objectContaining({
          id: KAFKA_ID,
          family: 'kafka',
          supported: true,
        }),
      ])
    );
  });

  it('refuses tools of another family', async () => {
    const { isError, text } = await callTool('kafka_list_topics', {
      connectionId: RABBIT_ID,
    });

    expect(isError).toBe(true);
    expect(text).toContain('not Kafka');
  });

  describe('RabbitMQ', () => {
    const rabbit = (args: Record<string, unknown> = {}) => ({
      connectionId: RABBIT_ID,
      ...args,
    });

    it('returns the overview without chart samples', async () => {
      const overview = await callJson<Record<string, unknown>>(
        'rabbitmq_overview',
        rabbit()
      );

      expect(overview.vhosts).toContain(rabbitFixture.vhost);
      expect(overview).not.toHaveProperty('samples');
    });

    it('lists and describes queues', async () => {
      const page = await callJson<{ items: { name: string }[] }>(
        'rabbitmq_list_queues',
        rabbit({ vhost: rabbitFixture.vhost, search: 'backlog' })
      );
      expect(page.items.map(item => item.name)).toEqual([BACKLOG_QUEUE]);

      const detail = await callJson<{ bindings: unknown[] }>(
        'rabbitmq_describe_queue',
        rabbit({ vhost: rabbitFixture.vhost, queue: BACKLOG_QUEUE })
      );
      expect(detail.bindings.length).toBeGreaterThan(0);
      expect(detail).not.toHaveProperty('samples');
    });

    it('lists exchanges', async () => {
      const exchanges = await callJson<{ name: string; type: string }[]>(
        'rabbitmq_list_exchanges',
        rabbit({ vhost: rabbitFixture.vhost })
      );

      expect(exchanges).toContainEqual(
        expect.objectContaining({ name: 'events.topic', type: 'topic' })
      );
    });

    it('peeks messages without consuming them', async () => {
      const args = rabbit({ vhost: rabbitFixture.vhost, queue: BACKLOG_QUEUE });
      const countReady = async () =>
        (
          await callJson<{ messagesReady: number }>(
            'rabbitmq_describe_queue',
            args
          )
        ).messagesReady;
      const before = await countReady();
      const messages = await callJson<{ payload: string }[]>(
        'rabbitmq_peek_messages',
        { ...args, count: 3 }
      );

      expect(messages).toHaveLength(3);
      expect(messages[0]?.payload).toContain('plain text message');
      expect(await countReady()).toBe(before);
    });

    it('lists and describes users', async () => {
      const snapshot = await callJson<{ users: { name: string }[] }>(
        'rabbitmq_list_users',
        rabbit()
      );
      expect(snapshot.users.map(user => user.name)).toContain('orcaq_viewer');

      const viewer = await callJson<{
        tags: string[];
        topicPermissions: { exchange: string }[];
      }>('rabbitmq_describe_user', rabbit({ user: 'orcaq_viewer' }));
      expect(viewer.tags).toContain('management');
      expect(viewer.topicPermissions[0]?.exchange).toBe('events.topic');
      expect(JSON.stringify(viewer)).not.toContain('password_hash');
    });

    it('lists and describes policies', async () => {
      const snapshot = await callJson<{
        policies: { name: string; kind: string }[];
      }>('rabbitmq_list_policies', rabbit({ vhost: rabbitFixture.vhost }));
      expect(snapshot.policies).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'orders-max-length', kind: 'user' }),
          expect.objectContaining({ name: 'cap-length', kind: 'operator' }),
        ])
      );

      const policy = await callJson<{ definition: Record<string, unknown> }>(
        'rabbitmq_describe_policy',
        rabbit({ vhost: rabbitFixture.vhost, name: 'orders-max-length' })
      );
      expect(policy.definition).toEqual({ 'max-length': 100000 });
    });

    it('names a policy that does not exist', async () => {
      const { isError, text } = await callTool(
        'rabbitmq_describe_policy',
        rabbit({ vhost: rabbitFixture.vhost, name: 'ghost' })
      );

      expect(isError).toBe(true);
      expect(text).toContain('Policy "ghost" was not found');
    });
  });

  describe('Kafka', () => {
    const kafka = (args: Record<string, unknown> = {}) => ({
      connectionId: KAFKA_ID,
      ...args,
    });

    it('returns the overview and topics', async () => {
      const overview = await callJson<{ brokers: unknown[] }>(
        'kafka_overview',
        kafka()
      );
      expect(overview.brokers.length).toBeGreaterThan(0);

      const topics = await callJson<{ name: string; isInternal: boolean }[]>(
        'kafka_list_topics',
        kafka()
      );
      expect(topics.map(topic => topic.name)).toContain(ORDERS_TOPIC);
      expect(topics.some(topic => topic.isInternal)).toBe(false);
    });

    it('describes a topic with only non-default configs', async () => {
      const detail = await callJson<{
        partitions: unknown[];
        configs: { isDefault: boolean }[];
      }>('kafka_describe_topic', kafka({ topic: ORDERS_TOPIC }));

      expect(detail.partitions.length).toBeGreaterThan(0);
      expect(detail.configs.every(config => !config.isDefault)).toBe(true);
    });

    it('reads messages without moving the group lag', async () => {
      const lagOf = async () =>
        (
          await callJson<{ totalLag: number }>(
            'kafka_describe_consumer_group',
            kafka({ groupId: GROUP_ID })
          )
        ).totalLag;
      const before = await lagOf();
      const page = await callJson<{
        messages: unknown[];
        nextCursors: unknown[];
      }>(
        'kafka_read_messages',
        kafka({ topic: ORDERS_TOPIC, start: 'earliest', limit: 2 })
      );

      expect(page.messages).toHaveLength(2);
      expect(page.nextCursors.length).toBeGreaterThan(0);
      expect(await lagOf()).toBe(before);
    });

    it('lists consumer groups with lag', async () => {
      const groups = await callJson<{ groupId: string; totalLag: number }[]>(
        'kafka_list_consumer_groups',
        kafka()
      );

      expect(groups).toContainEqual(
        expect.objectContaining({ groupId: GROUP_ID })
      );
    });

    it('names a topic that does not exist', async () => {
      const { isError, text } = await callTool(
        'kafka_describe_topic',
        kafka({ topic: 'orcaq.ghost' })
      );

      expect(isError).toBe(true);
      expect(text).toContain('Topic "orcaq.ghost" was not found.');
    });
  });
});
