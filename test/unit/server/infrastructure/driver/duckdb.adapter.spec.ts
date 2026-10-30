import { DuckDBInstance } from '@duckdb/node-api';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { normalizeConnectionError } from '~/server/infrastructure/driver/connection-error';
import { DuckDbAdapter } from '~/server/infrastructure/driver/duckdb.adapter';
import { createDatabaseAdapter } from '~/server/infrastructure/driver/factory';
import type { RawQueryResult } from '~/server/infrastructure/driver/types';

describe('DuckDbAdapter', () => {
  let adapter: DuckDbAdapter;

  afterEach(async () => {
    await adapter?.destroy();
  });

  it('is created by the driver factory', () => {
    adapter = createDatabaseAdapter(
      DatabaseClientType.DUCKDB,
      ':memory:'
    ) as DuckDbAdapter;

    expect(adapter).toBeInstanceOf(DuckDbAdapter);
    expect(adapter.dbType).toBe(DatabaseClientType.DUCKDB);
  });

  it.each([
    [':memory:'],
    ['duckdb:///:memory:'],
    [{ filename: ':memory:' }],
    [{ filePath: ':memory:' }],
  ])('opens an in-memory database from %j', async connection => {
    adapter = new DuckDbAdapter(connection as string);

    await expect(adapter.verifyConnection()).resolves.toBeUndefined();
  });

  it('rejects a missing file instead of creating one', () => {
    adapter = new DuckDbAdapter(':memory:');

    expect(() => new DuckDbAdapter('/tmp/orcaq-missing.duckdb')).toThrow(
      'DuckDB database file was not found'
    );
  });

  it('requires a filename', () => {
    adapter = new DuckDbAdapter(':memory:');

    expect(() => new DuckDbAdapter({})).toThrow(
      'DuckDB connections require a filename.'
    );
  });

  it('keeps session state across queries', async () => {
    adapter = new DuckDbAdapter(':memory:');

    await adapter.rawOut('CREATE TEMP TABLE session_scoped (id INTEGER)');
    await adapter.rawOut('INSERT INTO session_scoped VALUES (1)');

    await expect(
      adapter.rawOut('SELECT id FROM session_scoped')
    ).resolves.toMatchObject({ rows: [[1]] });
  });

  it('serializes types JSON cannot carry losslessly', async () => {
    adapter = new DuckDbAdapter(':memory:');

    const [row] = await adapter.rawQuery(`
      SELECT
        170141183460469231731687303715884105727::HUGEINT AS huge,
        12.50::DECIMAL(10, 2) AS price,
        DATE '2024-01-02' AS day,
        ['a', 'b'] AS tags,
        {'a': 1} AS nested
    `);

    expect(row).toEqual({
      huge: '170141183460469231731687303715884105727',
      price: '12.50',
      day: '2024-01-02',
      tags: ['a', 'b'],
      nested: { a: 1 },
    });
    expect(() => JSON.stringify(row)).not.toThrow();
  });

  it('binds positional parameters', async () => {
    adapter = new DuckDbAdapter(':memory:');

    await expect(
      adapter.rawQuery('SELECT ? AS text_value, ? AS null_value LIMIT ?', [
        'x',
        undefined,
        1,
      ])
    ).resolves.toEqual([{ text_value: 'x', null_value: null }]);
  });

  it('returns positional rows and deduplicated fields from rawOut', async () => {
    adapter = new DuckDbAdapter(':memory:');

    const result: RawQueryResult<unknown[]> = await adapter.rawOut(
      '-- leading comment\nSELECT 1 AS a, 2 AS a'
    );

    expect(result.rows).toEqual([[1, 2]]);
    expect(new Set(result.fields?.map(field => field.name)).size).toBe(2);
    expect(result.rowCount).toBe(1);
    expect(result.command).toBe('SELECT');
  });

  it('reports the affected row count for mutations', async () => {
    adapter = new DuckDbAdapter(':memory:');
    await adapter.rawQuery('CREATE TABLE t (id INTEGER)');

    await expect(
      adapter.rawOut('INSERT INTO t VALUES (1), (2)')
    ).resolves.toEqual({
      rows: [],
      fields: [],
      rowCount: 2,
      command: 'INSERT',
    });
  });

  it('does not run statements while a raw connection is held', async () => {
    adapter = new DuckDbAdapter(':memory:');
    await adapter.rawQuery('CREATE TABLE t (id INTEGER)');

    const connection = await adapter.acquireRawConnection();
    await connection.run('BEGIN TRANSACTION');
    await connection.run('INSERT INTO t VALUES (1)');

    const pending = adapter.rawOut('SELECT COUNT(*) AS total FROM t');
    await connection.run('ROLLBACK');
    await adapter.releaseRawConnection();

    await expect(pending).resolves.toMatchObject({ rows: [['0']] });
  });

  it('keeps browsing responsive while a long query runs', async () => {
    adapter = new DuckDbAdapter(':memory:');

    const longQuery = adapter.rawOut(
      'SELECT COUNT(*) FROM range(100000000000) a, range(1000) b'
    );
    await new Promise(resolve => setTimeout(resolve, 100));

    await expect(adapter.rawQuery('SELECT 1 AS ok')).resolves.toEqual([
      { ok: 1 },
    ]);

    await adapter.interruptQuery();
    await expect(longQuery).rejects.toThrow(/interrupt/i);
  });

  it('frees the query session when a stream is abandoned', async () => {
    adapter = new DuckDbAdapter(':memory:');

    for await (const event of adapter.streamResult(
      'SELECT * FROM range(100000)'
    )) {
      if (event.type === 'rows') {
        break;
      }
    }

    await expect(adapter.rawOut('SELECT 1 AS ok')).resolves.toMatchObject({
      rows: [[1]],
    });
  });

  it('recovers after a failed statement', async () => {
    adapter = new DuckDbAdapter(':memory:');

    await expect(adapter.rawQuery('SELECT * FROM nope')).rejects.toThrow(
      'Catalog Error'
    );
    await expect(adapter.rawQuery('SELECT 1 AS ok')).resolves.toEqual([
      { ok: 1 },
    ]);
  });

  it('streams rows', async () => {
    adapter = new DuckDbAdapter(':memory:');

    const rows: unknown[] = [];
    for await (const row of adapter.streamQuery(
      'SELECT * FROM (VALUES (1), (2)) t(id) ORDER BY id'
    )) {
      rows.push(row);
    }

    expect(rows).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('compiles named bindings into DuckDB placeholders', () => {
    adapter = new DuckDbAdapter(':memory:');

    const native = adapter.getNativeSql('SELECT :value AS v', { value: 1 });

    expect(native.sql).toBe('SELECT $1 AS v');
    expect(Array.from(native.bindings)).toEqual([1]);
  });

  describe('with a database file', () => {
    let directory: string;
    let filePath: string;

    beforeAll(async () => {
      directory = mkdtempSync(join(tmpdir(), 'orcaq-duckdb-'));
      filePath = join(directory, 'sample.duckdb');

      const instance = await DuckDBInstance.create(filePath);
      const connection = await instance.connect();
      await connection.run('CREATE TABLE t AS SELECT 1 AS id');
      connection.closeSync();
      instance.closeSync();
    });

    afterAll(() => {
      rmSync(directory, { recursive: true, force: true });
    });

    it('survives another adapter opening and closing the same file', async () => {
      adapter = new DuckDbAdapter({ filename: filePath });
      await adapter.rawQuery('SELECT * FROM t');

      const healthCheckAdapter = new DuckDbAdapter({ filename: filePath });
      await healthCheckAdapter.verifyConnection();
      await healthCheckAdapter.destroy();

      await expect(adapter.rawQuery('SELECT id FROM t')).resolves.toEqual([
        { id: 1 },
      ]);
    });

    it('reads a duckdb:// connection string', async () => {
      adapter = new DuckDbAdapter(`duckdb://${filePath}`);

      await expect(adapter.rawQuery('SELECT id FROM t')).resolves.toEqual([
        { id: 1 },
      ]);
    });
  });
});

describe('normalizeConnectionError for DuckDB', () => {
  it.each([
    [
      'DuckDB database file was not found: /tmp/a.duckdb',
      'The DuckDB file could not be opened.',
    ],
    [
      'IO Error: Could not set lock on file "/tmp/a.duckdb": Conflicting lock is held',
      'The DuckDB file is locked by another program.',
    ],
    [
      'IO Error: The file "/tmp/a.db" exists, but it is not a valid DuckDB database file!',
      'This file is not a DuckDB database.',
    ],
    [
      'Failed to load the DuckDB driver: no binding',
      'DuckDB is not available on this platform.',
    ],
  ])('explains %s', (detail, message) => {
    expect(normalizeConnectionError(new Error(detail))).toMatchObject({
      message,
      detail,
    });
  });
});
