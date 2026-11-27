import { describe, expect, it } from 'vitest';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { normalizeEditedCellValue } from '~/core/helpers/cell-value';
import {
  buildDeleteStatements,
  buildUpdateStatements,
  toSqlLiteral,
} from '~/core/helpers/sql-mutation-statements';

const binary = { type: 'Buffer', data: [222, 173, 190, 239] };

describe('SQL literals for binary values', () => {
  it.each([
    [DatabaseClientType.POSTGRES, "decode('deadbeef', 'hex')"],
    [DatabaseClientType.MYSQL, "X'deadbeef'"],
    [DatabaseClientType.MYSQL2, "X'deadbeef'"],
    [DatabaseClientType.MARIADB, "X'deadbeef'"],
    [DatabaseClientType.SQLITE3, "X'deadbeef'"],
    [DatabaseClientType.BETTER_SQLITE3, "X'deadbeef'"],
    [DatabaseClientType.ORACLE, "HEXTORAW('deadbeef')"],
    [DatabaseClientType.MSSQL, '0xdeadbeef'],
    [undefined, "X'deadbeef'"],
  ])('%s', (dbType, expected) => {
    expect(toSqlLiteral(binary, { dbType })).toBe(expected);
  });

  it('never writes the Buffer JSON text', () => {
    expect(
      toSqlLiteral(binary, { dbType: DatabaseClientType.POSTGRES })
    ).not.toContain('Buffer');
  });

  it('keeps non-binary objects as JSON strings', () => {
    expect(
      toSqlLiteral(
        { type: 'Point', data: [1] },
        {
          dbType: DatabaseClientType.POSTGRES,
        }
      )
    ).toBe(`'{"type":"Point","data":[1]}'`);
  });
});

describe('saving an edited binary cell', () => {
  it('UPDATE sets the bytes with a binary literal', () => {
    const value = normalizeEditedCellValue({
      fieldType: 'bytea',
      isObjectColumn: true,
      value: { type: 'Buffer', data: [1, 2] },
    });

    const { sql } = buildUpdateStatements({
      schemaName: 'public',
      tableName: 'files',
      pKeys: ['id'],
      pKeyValue: { id: 1 },
      update: { content: value },
      dbType: DatabaseClientType.POSTGRES,
    });

    expect(sql).toContain(`"content" = decode('0102', 'hex')`);
  });

  it('WHERE on a table without a primary key matches the stored bytes', () => {
    const { sql } = buildUpdateStatements({
      schemaName: 'app',
      tableName: 'files',
      pKeys: [],
      pKeyValue: { name: 'a', content: binary },
      update: { name: 'b' },
      dbType: DatabaseClientType.MYSQL,
    });

    expect(sql).toContain("= X'deadbeef'");
    expect(sql).not.toContain('Buffer');
  });

  it('DELETE by a binary key uses the binary literal', () => {
    const { sql } = buildDeleteStatements({
      schemaName: 'main',
      tableName: 'files',
      pKeys: ['hash'],
      pKeyValue: { hash: binary },
      dbType: DatabaseClientType.SQLITE3,
    });

    expect(sql).toContain("X'deadbeef'");
  });
});
