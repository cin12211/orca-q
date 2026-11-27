import { createClient } from '@libsql/client';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { parseBinaryInput } from '~/core/helpers/binary-value';
import { normalizeEditedCellValue } from '~/core/helpers/cell-value';
import { buildUpdateStatements } from '~/core/helpers/sql-mutation-statements';
import {
  serializeSqliteRow,
  SqliteQueryAdapter,
  toTransportSqliteValue,
} from '~/server/infrastructure/database/adapters/query/sqlite/sqlite-query.adapter';
import { SqliteAdapter } from '~/server/infrastructure/driver/sqlite.adapter';

/** What the browser receives: the row after JSON transport. */
const overTheWire = (row: Record<string, unknown>) =>
  JSON.parse(JSON.stringify(serializeSqliteRow(row)));

describe('toTransportSqliteValue', () => {
  const bytes = [0xde, 0xad, 0xbe, 0xef];

  it('sends Buffer, ArrayBuffer and typed-array blobs as Buffer JSON', () => {
    const fromBuffer = Buffer.from(bytes);
    const fromArrayBuffer = Uint8Array.from(bytes).buffer;
    const fromView = Uint8Array.from([0, ...bytes, 0]).subarray(1, 5);

    for (const value of [fromBuffer, fromArrayBuffer, fromView]) {
      expect(overTheWire({ data: value })).toEqual({
        data: { type: 'Buffer', data: bytes },
      });
    }
  });

  it('leaves non-binary values untouched', () => {
    for (const value of ['deadbeef', 42, null, 1.5, '2024-01-15']) {
      expect(toTransportSqliteValue(value)).toBe(value);
    }
  });
});

describe('SqliteQueryAdapter.execute (Quick Query read path)', () => {
  it('serializes BLOBs like rawExecute does', async () => {
    const driver = {
      rawQuery: async () => [
        { id: 1, data: Uint8Array.from([1, 2, 255]).buffer, note: 'x' },
      ],
    };
    const QueryAdapter = SqliteQueryAdapter as unknown as new (
      adapter: unknown
    ) => SqliteQueryAdapter;

    const { result } = await new QueryAdapter(driver).execute('SELECT 1');

    expect(JSON.parse(JSON.stringify(result))).toEqual([
      { id: 1, data: { type: 'Buffer', data: [1, 2, 255] }, note: 'x' },
    ]);
  });
});

describe('SQLite BLOB round trip on a real database file', () => {
  let dir: string;
  let file: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'orcaq-blob-'));
    file = join(dir, 'blob.db');
    writeFileSync(file, '');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('shows, matches in WHERE, and saves BLOBs as bytes (sqlite3)', async () => {
    const adapter = new SqliteAdapter(file);
    try {
      await adapter.knex.raw('CREATE TABLE f (name TEXT, data BLOB)');
      await adapter.knex.raw("INSERT INTO f VALUES ('a', X'DEADBEEF')");

      const { rows, fields } =
        await adapter.rawOut<unknown[]>('SELECT * FROM f');
      const row = overTheWire(
        Object.fromEntries(fields.map((f, i) => [f.name, rows[0][i]]))
      );
      expect(row.data).toEqual({ type: 'Buffer', data: [222, 173, 190, 239] });

      // No primary key: the BLOB is part of the WHERE clause.
      const renamed = buildUpdateStatements({
        schemaName: '',
        tableName: 'f',
        pKeys: [],
        pKeyValue: row,
        update: { name: 'b' },
        dbType: DatabaseClientType.SQLITE3,
      }).sql;
      expect(renamed).toContain(`"data" = X'deadbeef'`);
      await adapter.knex.raw(renamed);

      const edited = buildUpdateStatements({
        schemaName: '',
        tableName: 'f',
        pKeys: [],
        pKeyValue: { ...row, name: 'b' },
        update: {
          data: normalizeEditedCellValue({
            fieldType: 'BLOB',
            isObjectColumn: true,
            value: parseBinaryInput('0x0102ff'),
          }),
        },
        dbType: DatabaseClientType.SQLITE3,
      }).sql;
      await adapter.knex.raw(edited);

      expect(
        await adapter.rawQuery(
          'SELECT name, typeof(data) AS kind, hex(data) AS hex FROM f'
        )
      ).toEqual([{ name: 'b', kind: 'blob', hex: '0102FF' }]);
    } finally {
      await adapter.knex.destroy();
    }
  });

  it('keeps the bytes the libsql (Turso) client returns as ArrayBuffer', async () => {
    const client = createClient({ url: `file:${file}` });
    try {
      await client.execute('CREATE TABLE f (data BLOB)');
      await client.execute("INSERT INTO f VALUES (X'0102FF')");
      const result = await client.execute('SELECT data FROM f');

      expect(result.rows[0].data).toBeInstanceOf(ArrayBuffer);
      expect(overTheWire({ data: result.rows[0].data })).toEqual({
        data: { type: 'Buffer', data: [1, 2, 255] },
      });
    } finally {
      client.close();
    }
  });
});
