import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DuckDbAdapter } from '~/server/infrastructure/driver/duckdb.adapter';
import { executeDuckDbSandboxedQuery } from '~/server/infrastructure/mcp/query-executor';

const tempDir = mkdtempSync(path.join(tmpdir(), 'orcaq-duckdb-mcp-'));
const databasePath = path.join(tempDir, 'shop.duckdb');
const secretPath = path.join(tempDir, 'secret.txt');

// The app's own adapter stays open throughout, as it does on the desktop.
let appAdapter: DuckDbAdapter;

const EXTERNAL_ACCESS_BLOCKED =
  /disabled by configuration|external access|read-only|Table with name/i;

const run = (sql: string, limit = 100) =>
  executeDuckDbSandboxedQuery(databasePath, sql, limit);

describe('executeDuckDbSandboxedQuery', () => {
  beforeAll(async () => {
    writeFileSync(secretPath, 'top secret\n');
    // Created through the driver: the adapter only opens existing files.
    const { DuckDBInstance } = await import('@duckdb/node-api');
    const instance = await DuckDBInstance.create(databasePath);
    const connection = await instance.connect();
    await connection.run(
      'CREATE TABLE products AS SELECT i AS id, 170141183460469231731687303715884105727::HUGEINT AS big FROM range(5) t(i)'
    );
    connection.closeSync();
    instance.closeSync();

    appAdapter = new DuckDbAdapter({ filename: databasePath });
    await appAdapter.verifyConnection();
  });

  afterAll(async () => {
    await appAdapter.destroy();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('reads the database while the app holds the file open', async () => {
    const result = await run(
      'SELECT id, big FROM products ORDER BY id LIMIT 1'
    );

    expect(result.columns).toEqual(['id', 'big']);
    expect(result.rows).toEqual([
      { id: '0', big: '170141183460469231731687303715884105727' },
    ]);
  });

  it('sees changes the app has not checkpointed yet', async () => {
    await appAdapter.rawOut('INSERT INTO products (id) VALUES (100)');

    const result = await run('SELECT COUNT(*) AS total FROM products');

    expect(result.rows).toEqual([{ total: '6' }]);
  });

  it('truncates to the requested limit', async () => {
    const result = await run('SELECT * FROM range(10000)', 3);

    expect(result.rows).toHaveLength(3);
    expect(result.truncated).toBe(true);
  });

  it.each([
    [`SELECT * FROM read_text('${secretPath}')`],
    [`SELECT * FROM read_csv('${secretPath}')`],
    [`SELECT * FROM read_blob('${secretPath}')`],
    [`SELECT * FROM glob('${tempDir}/*')`],
    [`SELECT * FROM '${secretPath}'`],
    [`ATTACH '${path.join(tempDir, 'other.duckdb')}' AS other`],
    [`COPY products TO '${path.join(tempDir, 'leak.csv')}'`],
    ['INSTALL httpfs'],
  ])('blocks access outside the database: %s', async sql => {
    await expect(run(sql)).rejects.toThrow(EXTERNAL_ACCESS_BLOCKED);
  });

  it.each([
    ['INSERT INTO products (id) VALUES (1)'],
    ['DROP TABLE products'],
    ['CREATE TABLE x (id INTEGER)'],
  ])('rejects writes at the engine level: %s', async sql => {
    await expect(run(sql)).rejects.toThrow(/read-only/i);
  });

  it('cannot turn the restrictions back off', async () => {
    await expect(run('SET enable_external_access = true')).rejects.toThrow(
      /locked/i
    );
  });

  it('refuses in-memory databases', async () => {
    await expect(
      executeDuckDbSandboxedQuery(':memory:', 'SELECT 1', 10)
    ).rejects.toThrow('In-memory');
  });
});
