import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import knex from 'knex';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createOrcaqMcpServer,
  DESKTOP_PERSIST_DB_PATH_ENV,
} from '~/server/infrastructure/mcp';

const tempDir = mkdtempSync(path.join(tmpdir(), 'orcaq-mcp-'));
const persistDbPath = path.join(tempDir, 'orcaq.db');
const targetDbPath = path.join(tempDir, 'shop.sqlite');

async function seedDatabases(access: Record<string, string>) {
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
  await persist('workspaces').insert({ id: 'ws-1', name: 'Shop' });
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
      workspace_id: 'ws-1',
      name: 'Hidden',
      type: 'sqlite3',
      method: 'file',
      file_path: targetDbPath,
      created_at: '2026-01-03',
    },
  ]);
  await persist('app_config').insert({
    id: 'app-config',
    data: JSON.stringify({
      mcpServerConfigs: { enabled: true, connectionAccess: access },
    }),
  });
  await persist.destroy();
}

async function callTool(name: string, args: Record<string, unknown> = {}) {
  const server = createOrcaqMcpServer();
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
    await seedDatabases({ 'conn-rw': 'write', 'conn-off': 'off' });
    process.env[DESKTOP_PERSIST_DB_PATH_ENV] = persistDbPath;
  });

  afterAll(() => {
    delete process.env[DESKTOP_PERSIST_DB_PATH_ENV];
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

  it('hides connections set to off', async () => {
    const { isError, text } = await callTool('list_tables', {
      connectionId: 'conn-off',
      schema: 'main',
    });

    expect(isError).toBe(true);
    expect(text).toContain('not shared with MCP');
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
});
