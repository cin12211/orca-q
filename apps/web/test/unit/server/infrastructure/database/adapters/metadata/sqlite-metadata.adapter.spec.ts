import { describe, expect, it, vi } from 'vitest';
import { SqliteMetadataAdapter } from '~/server/infrastructure/database/adapters/metadata/sqlite/sqlite-metadata.adapter';

describe('SqliteMetadataAdapter', () => {
  it('falls back to the main schema for D1 when PRAGMA database_list is blocked', async () => {
    const rawQueryMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('not authorized: SQLITE_AUTH'))
      .mockResolvedValueOnce([
        {
          name: 'users',
          type: 'table',
          sql: `CREATE TABLE users (
            id INTEGER PRIMARY KEY,
            org_id TEXT NOT NULL REFERENCES orgs(id),
            email TEXT DEFAULT ''
          )`,
        },
      ]);

    const adapter = new (SqliteMetadataAdapter as any)({
      connection: 'd1://account/database',
      rawQuery: rawQueryMock,
    });

    const result = await adapter.getSchemaMetaData();

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('main');
    expect(result[0]?.tables).toEqual(['users']);
    expect(
      result[0]?.table_details?.users.columns.map(column => column.name)
    ).toEqual(['id', 'org_id', 'email']);
    expect(result[0]?.table_details?.users.primary_keys).toEqual([
      { column: 'id' },
    ]);
    expect(result[0]?.table_details?.users.foreign_keys).toEqual([
      {
        column: 'org_id',
        referenced_column: 'id',
        referenced_table: 'orgs',
        referenced_table_schema: 'main',
      },
    ]);
    expect(rawQueryMock).toHaveBeenNthCalledWith(1, 'PRAGMA database_list');
    expect(rawQueryMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('FROM "main".sqlite_master')
    );
    expect(rawQueryMock).toHaveBeenCalledTimes(2);
  });

  it('rethrows database_list errors for non-D1 SQLite connections', async () => {
    const rawQueryMock = vi
      .fn()
      .mockRejectedValue(new Error('not authorized: SQLITE_AUTH'));

    const adapter = new (SqliteMetadataAdapter as any)({
      connection: ':memory:',
      rawQuery: rawQueryMock,
    });

    await expect(adapter.getSchemaMetaData()).rejects.toThrow('SQLITE_AUTH');
  });

  it('returns only schema names and skips table/view queries when namesOnly is set', async () => {
    const rawQueryMock = vi.fn().mockResolvedValueOnce([
      { seq: 0, name: 'main', file: '/tmp/db.sqlite' },
      { seq: 1, name: 'temp', file: '' },
    ]);

    const adapter = new (SqliteMetadataAdapter as any)({
      connection: ':memory:',
      rawQuery: rawQueryMock,
    });

    const result = await adapter.getSchemaMetaData({ namesOnly: true });

    expect(result).toEqual([
      {
        name: 'main',
        tables: null,
        views: null,
        functions: null,
        table_details: null,
        view_details: null,
      },
    ]);
    // Only PRAGMA database_list should run — no per-table/view PRAGMA calls.
    expect(rawQueryMock).toHaveBeenCalledTimes(1);
    expect(rawQueryMock).toHaveBeenCalledWith('PRAGMA database_list');
  });

  it('scopes getSchemaMetaData to a single schema when schemaName is set', async () => {
    const rawQueryMock = vi
      .fn()
      .mockResolvedValueOnce([
        { seq: 0, name: 'main', file: '/tmp/db.sqlite' },
        { seq: 1, name: 'analytics', file: '/tmp/analytics.sqlite' },
      ])
      .mockResolvedValueOnce([]); // sqlite_master for the scoped schema

    const adapter = new (SqliteMetadataAdapter as any)({
      connection: ':memory:',
      rawQuery: rawQueryMock,
    });

    const result = await adapter.getSchemaMetaData({
      schemaName: 'analytics',
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('analytics');
    expect(rawQueryMock).toHaveBeenCalledTimes(2);
    expect(rawQueryMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('FROM "analytics".sqlite_master')
    );
  });
});
