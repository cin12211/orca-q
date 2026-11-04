import { mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { createDatabaseFile } from '~~/server/infrastructure/driver/db-connection/create-database-file';
import { DuckDbAdapter } from '~~/server/infrastructure/driver/duckdb.adapter';
import { SqliteAdapter } from '~~/server/infrastructure/driver/sqlite.adapter';

const directory = mkdtempSync(join(tmpdir(), 'orcaq-create-db-'));
let fileCounter = 0;

const uniqueName = () => `database-${(fileCounter += 1)}`;

describe('createDatabaseFile', () => {
  beforeEach(() => {
    vi.stubEnv('ORCAQ_DESKTOP_RUNTIME', '1');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  afterAll(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  it('creates a DuckDB database the adapter can open', async () => {
    const filePath = await createDatabaseFile({
      type: DatabaseClientType.DUCKDB,
      directory,
      fileName: uniqueName(),
    });
    const adapter = new DuckDbAdapter({ filename: filePath });

    expect(filePath).toMatch(/\.duckdb$/);

    try {
      await adapter.rawOut('CREATE TABLE t (id INTEGER)');
      await expect(adapter.rawQuery('SELECT * FROM t')).resolves.toEqual([]);
    } finally {
      await adapter.destroy();
    }
  });

  it('creates a SQLite database the adapter can open', async () => {
    const filePath = await createDatabaseFile({
      type: DatabaseClientType.SQLITE3,
      directory,
      fileName: uniqueName(),
    });
    const adapter = new SqliteAdapter({ filename: filePath });

    expect(filePath).toMatch(/\.sqlite$/);

    try {
      await adapter.rawOut('CREATE TABLE t (id INTEGER)');
      await expect(adapter.rawQuery('SELECT * FROM t')).resolves.toEqual([]);
    } finally {
      await adapter.destroy();
    }
  });

  it('applies the chosen SQLite options', async () => {
    const filePath = await createDatabaseFile({
      type: DatabaseClientType.SQLITE3,
      directory,
      fileName: uniqueName(),
      options: {
        journalMode: 'WAL',
        pageSize: '8192',
        encoding: 'UTF-16',
        autoVacuum: 'FULL',
      },
    });
    const adapter = new SqliteAdapter({ filename: filePath });

    try {
      await expect(adapter.rawQuery('PRAGMA journal_mode')).resolves.toEqual([
        { journal_mode: 'wal' },
      ]);
      await expect(adapter.rawQuery('PRAGMA page_size')).resolves.toEqual([
        { page_size: 8192 },
      ]);
      await expect(adapter.rawQuery('PRAGMA auto_vacuum')).resolves.toEqual([
        { auto_vacuum: 1 },
      ]);
      const [{ encoding }] = await adapter.rawQuery('PRAGMA encoding');
      expect(encoding).toMatch(/^UTF-16/);
      await expect(
        adapter.rawQuery('SELECT name FROM sqlite_master')
      ).resolves.toEqual([]);
    } finally {
      await adapter.destroy();
    }
  });

  it('applies the chosen DuckDB options', async () => {
    const filePath = await createDatabaseFile({
      type: DatabaseClientType.DUCKDB,
      directory,
      fileName: uniqueName(),
      options: { storageVersion: 'v1.0.0', blockSize: '16384' },
    });
    const adapter = new DuckDbAdapter({ filename: filePath });

    try {
      const [database] = await adapter.rawQuery<{
        tags: { key: string; value: string }[];
      }>('SELECT tags FROM duckdb_databases() WHERE NOT internal');
      const [size] = await adapter.rawQuery(
        'SELECT block_size FROM pragma_database_size()'
      );

      expect(database?.tags).toContainEqual({
        key: 'storage_version',
        value: 'v1.0.0+',
      });
      expect(size).toEqual({ block_size: '16384' });
    } finally {
      await adapter.destroy();
    }
  });

  it('refuses values outside the offered choices', async () => {
    await expect(
      createDatabaseFile({
        type: DatabaseClientType.SQLITE3,
        directory,
        fileName: uniqueName(),
        options: { journalMode: 'WAL; DROP TABLE x' },
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('keeps an extension the user typed', async () => {
    const fileName = `${uniqueName()}.db`;

    await expect(
      createDatabaseFile({
        type: DatabaseClientType.SQLITE3,
        directory,
        fileName,
      })
    ).resolves.toBe(join(directory, fileName));
  });

  it('never overwrites an existing file', async () => {
    const fileName = `${uniqueName()}.duckdb`;
    const existing = join(directory, fileName);
    writeFileSync(existing, 'keep me');

    await expect(
      createDatabaseFile({
        type: DatabaseClientType.DUCKDB,
        directory,
        fileName,
      })
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(statSync(existing).size).toBe('keep me'.length);
  });

  it.each(['../escape', 'nested/name', 'nested\\name', '.hidden'])(
    'refuses the file name %s',
    async fileName => {
      await expect(
        createDatabaseFile({
          type: DatabaseClientType.SQLITE3,
          directory,
          fileName,
        })
      ).rejects.toMatchObject({ statusCode: 400 });
    }
  );

  it('refuses a missing folder', async () => {
    await expect(
      createDatabaseFile({
        type: DatabaseClientType.SQLITE3,
        directory: join(directory, 'missing'),
        fileName: uniqueName(),
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('refuses database types without a file', async () => {
    await expect(
      createDatabaseFile({
        type: DatabaseClientType.POSTGRES,
        directory,
        fileName: uniqueName(),
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('stays off web deployments', async () => {
    vi.stubEnv('ORCAQ_DESKTOP_RUNTIME', '');

    await expect(
      createDatabaseFile({
        type: DatabaseClientType.SQLITE3,
        directory,
        fileName: uniqueName(),
      })
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});
