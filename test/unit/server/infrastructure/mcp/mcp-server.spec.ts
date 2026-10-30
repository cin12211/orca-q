import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import knex from 'knex';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { McpSession } from '~/core/persist/normalize';
import {
  createOrcaqMcpServer,
  DESKTOP_PERSIST_DB_PATH_ENV,
  DESKTOP_RUNTIME_ENV,
  getDesktopPersistDbPath,
  findMcpSessionByToken,
  findTokenlessMcpSession,
  listMcpSessions,
} from '~/server/infrastructure/mcp';

const SESSION_TOKEN = 'orcaq_test-token';
const OTHER_TOKEN = 'orcaq_other-token';

const tempDir = mkdtempSync(path.join(tmpdir(), 'orcaq-mcp-'));
const persistDbPath = path.join(tempDir, 'orcaq.db');
const targetDbPath = path.join(tempDir, 'shop.sqlite');

async function seedDatabases() {
  const target = knex({
    client: 'sqlite3',
    connection: { filename: targetDbPath },
    useNullAsDefault: true,
  });
  await target.raw(
    'CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY, name TEXT NOT NULL)'
  );
  await target('products').del();
  await target('products').insert(
    Array.from({ length: 5 }, (_, index) => ({ name: `item-${index}` }))
  );
  await target.destroy();

  const persist = knex({
    client: 'sqlite3',
    connection: { filename: persistDbPath },
    useNullAsDefault: true,
  });
  await persist.raw(
    'CREATE TABLE IF NOT EXISTS app_config (id TEXT PRIMARY KEY, data TEXT NOT NULL)'
  );
  await persist.raw(
    'CREATE TABLE IF NOT EXISTS workspaces (id TEXT PRIMARY KEY, name TEXT)'
  );
  await persist.raw(`CREATE TABLE IF NOT EXISTS connections (
    id TEXT PRIMARY KEY, workspace_id TEXT, name TEXT, type TEXT, method TEXT,
    provider_kind TEXT, connection_string TEXT, host TEXT, port TEXT,
    username TEXT, password TEXT, database TEXT, service_name TEXT,
    file_path TEXT, managed_sqlite TEXT, ssl TEXT, ssh TEXT, tag_ids TEXT,
    created_at TEXT, updated_at TEXT)`);
  await persist('workspaces').insert([
    { id: 'ws-1', name: 'Shop' },
    { id: 'ws-2', name: 'Private' },
  ]);
  await persist('connections').insert([
    {
      id: 'conn-ro',
      workspace_id: 'ws-1',
      name: 'Shop read',
      type: 'sqlite3',
      method: 'file',
      file_path: targetDbPath,
      password: 'secret',
      created_at: '2026-01-01',
    },
    {
      id: 'conn-rw',
      workspace_id: 'ws-1',
      name: 'Shop write',
      type: 'sqlite3',
      method: 'file',
      file_path: targetDbPath,
      created_at: '2026-01-02',
    },
    {
      id: 'conn-off',
      workspace_id: 'ws-2',
      name: 'Hidden',
      type: 'sqlite3',
      method: 'file',
      file_path: targetDbPath,
      created_at: '2026-01-03',
    },
  ]);
  const session = {
    id: 'session-1',
    name: 'Claude Code',
    token: SESSION_TOKEN,
    createdAt: '2026-10-21',
    workspaceAccess: { 'ws-1': 'read' },
    connectionAccess: { 'conn-rw': 'write' },
  };
  const otherSession = {
    ...session,
    id: 'session-2',
    name: 'Other',
    token: OTHER_TOKEN,
    workspaceAccess: { 'ws-2': 'read' },
    connectionAccess: {},
  };
  await persist('app_config').insert({
    id: 'app-config',
    data: JSON.stringify({ mcpServerConfigs: { enabled: true } }),
  });
  await persist.raw(`CREATE TABLE IF NOT EXISTS mcp_sessions (
    id TEXT PRIMARY KEY, name TEXT, token TEXT, require_token INTEGER,
    workspace_access TEXT, connection_access TEXT, created_at TEXT,
    updated_at TEXT)`);
  await persist('mcp_sessions').insert(
    [session, otherSession].map(item => ({
      id: item.id,
      name: item.name,
      token: item.token,
      require_token: 1,
      workspace_access: JSON.stringify(item.workspaceAccess),
      connection_access: JSON.stringify(item.connectionAccess),
      created_at: item.id === 'session-1' ? '2026-10-21' : '2026-10-22',
    }))
  );
  await persist.destroy();
}

async function getSession(token: string): Promise<McpSession> {
  const session = await findMcpSessionByToken(await listMcpSessions(), token);
  if (!session) throw new Error('session not found');
  return session;
}

async function callTool(
  name: string,
  args: Record<string, unknown> = {},
  token = SESSION_TOKEN
) {
  const server = createOrcaqMcpServer(await getSession(token));
  const client = new Client({ name: 'test', version: '1.0.0' });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);

  try {
    const result = await client.callTool({ name, arguments: args });
    const text = (result.content as { text: string }[])[0]?.text ?? '';
    return { isError: Boolean(result.isError), text };
  } finally {
    await client.close();
    await server.close();
  }
}

describe('OrcaQ MCP server', () => {
  beforeAll(async () => {
    await seedDatabases();
    process.env[DESKTOP_PERSIST_DB_PATH_ENV] = persistDbPath;
    process.env[DESKTOP_RUNTIME_ENV] = '1';
  });

  afterAll(() => {
    delete process.env[DESKTOP_PERSIST_DB_PATH_ENV];
    delete process.env[DESKTOP_RUNTIME_ENV];
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('lists shared connections without credentials', async () => {
    const { text } = await callTool('list_connections');
    const connections = JSON.parse(text);

    expect(connections.map((c: { id: string }) => c.id)).toEqual([
      'conn-ro',
      'conn-rw',
    ]);
    expect(connections[0]).toMatchObject({
      workspace: 'Shop',
      access: 'read',
      supported: true,
    });
    expect(text).not.toContain('secret');
  });

  it('runs read queries with a row limit', async () => {
    const { isError, text } = await callTool('run_query', {
      connectionId: 'conn-ro',
      sql: 'SELECT id, name FROM products ORDER BY id',
      limit: 2,
    });
    const result = JSON.parse(text);

    expect(isError).toBe(false);
    expect(result.columns).toEqual(['id', 'name']);
    expect(result.rows).toEqual([
      { id: 1, name: 'item-0' },
      { id: 2, name: 'item-1' },
    ]);
    expect(result.truncated).toBe(true);
  });

  it('rejects writes on read-only connections', async () => {
    const { isError, text } = await callTool('run_query', {
      connectionId: 'conn-ro',
      sql: 'DELETE FROM products',
    });

    expect(isError).toBe(true);
    expect(text).toContain('read-only');
  });

  it('allows writes on connections with write access', async () => {
    const { isError, text } = await callTool('run_query', {
      connectionId: 'conn-rw',
      sql: "INSERT INTO products (name) VALUES ('new')",
    });

    expect(isError).toBe(false);
    expect(JSON.parse(text)).toMatchObject({ access: 'write', rowCount: 1 });
  });

  it('stays off outside the desktop runtime (web build)', async () => {
    delete process.env[DESKTOP_RUNTIME_ENV];

    try {
      expect(getDesktopPersistDbPath()).toBeNull();
      expect(await listMcpSessions()).toEqual([]);
    } finally {
      process.env[DESKTOP_RUNTIME_ENV] = '1';
    }
  });

  it('rejects unknown tokens', async () => {
    const session = await findMcpSessionByToken(
      await listMcpSessions(),
      'orcaq_wrong'
    );
    expect(session).toBeNull();
  });

  it('has no tokenless session unless one opts out of the token', async () => {
    const sessions = await listMcpSessions();
    expect(findTokenlessMcpSession(sessions)).toBeNull();

    const tokenless = findTokenlessMcpSession(
      sessions.map(session =>
        session.id === 'session-2'
          ? { ...session, requireToken: false }
          : session
      )
    );
    expect(tokenless?.name).toBe('Other');
  });

  it('scopes connections to the session', async () => {
    const other = JSON.parse(
      (await callTool('list_connections', {}, OTHER_TOKEN)).text
    );
    expect(other.map((c: { id: string }) => c.id)).toEqual(['conn-off']);
  });

  it('hides connections outside the session', async () => {
    const { isError, text } = await callTool('list_tables', {
      connectionId: 'conn-off',
      schema: 'main',
    });

    expect(isError).toBe(true);
    expect(text).toContain('has no access');
  });

  it('lists tables and describes columns', async () => {
    const tables = JSON.parse(
      (
        await callTool('list_tables', {
          connectionId: 'conn-ro',
          schema: 'main',
        })
      ).text
    );
    expect(tables.tables).toContain('products');

    const described = JSON.parse(
      (
        await callTool('describe_table', {
          connectionId: 'conn-ro',
          schema: 'main',
          table: 'products',
        })
      ).text
    );
    expect(
      described.columns.map(
        (column: { column_name: string }) => column.column_name
      )
    ).toEqual(['id', 'name']);
  });

  it('registers the read-only RabbitMQ and Kafka tools', async () => {
    const server = createOrcaqMcpServer(await getSession(SESSION_TOKEN));
    const client = new Client({ name: 'test', version: '1.0.0' });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);

    try {
      const { tools } = await client.listTools();
      const brokerTools = tools.filter(tool =>
        /^(rabbitmq|kafka)_/.test(tool.name)
      );

      expect(brokerTools.map(tool => tool.name).sort()).toEqual([
        'kafka_describe_consumer_group',
        'kafka_describe_topic',
        'kafka_list_consumer_groups',
        'kafka_list_topics',
        'kafka_overview',
        'kafka_read_messages',
        'rabbitmq_describe_policy',
        'rabbitmq_describe_queue',
        'rabbitmq_describe_user',
        'rabbitmq_list_exchanges',
        'rabbitmq_list_policies',
        'rabbitmq_list_queues',
        'rabbitmq_list_users',
        'rabbitmq_overview',
        'rabbitmq_peek_messages',
      ]);
      expect(
        brokerTools.every(tool => tool.annotations?.readOnlyHint === true)
      ).toBe(true);
    } finally {
      await client.close();
      await server.close();
    }
  });

  it('marks SQL connections with the sql family', async () => {
    const [connection] = JSON.parse((await callTool('list_connections')).text);
    expect(connection).toMatchObject({ family: 'sql', supported: true });
  });

  it('refuses broker tools on a SQL connection', async () => {
    const { isError, text } = await callTool('rabbitmq_overview', {
      connectionId: 'conn-ro',
    });

    expect(isError).toBe(true);
    expect(text).toContain('is sqlite3, not RabbitMQ');
  });

  it('hides broker tools from connections outside the session', async () => {
    const { isError, text } = await callTool('kafka_list_topics', {
      connectionId: 'conn-off',
    });

    expect(isError).toBe(true);
    expect(text).toContain('has no access');
  });
});
