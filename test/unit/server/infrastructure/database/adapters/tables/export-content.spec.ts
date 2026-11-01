import { describe, expect, it } from 'vitest';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { getSqlDialect } from '~/core/sql-dialect';
import { buildExportContent } from '~/server/infrastructure/database/adapters/tables/shared/export-content';

const base = {
  dialect: getSqlDialect(DatabaseClientType.MSSQL),
  schema: 'dbo',
  tableName: 'language',
  columns: ['id', 'name'],
  rows: [[1, "O'Neil, Jr"]],
};

describe('buildExportContent', () => {
  it('quotes CSV cells that need it', () => {
    expect(
      buildExportContent({ ...base, format: 'csv' }).split(/\r?\n/)
    ).toEqual(['id,name', `1,"O'Neil, Jr"`]);
  });

  it('writes JSON objects', () => {
    expect(JSON.parse(buildExportContent({ ...base, format: 'json' }))).toEqual(
      [{ id: 1, name: "O'Neil, Jr" }]
    );
  });

  it('writes INSERTs with the dialect quoting and literals', () => {
    expect(buildExportContent({ ...base, format: 'sql' })).toContain(
      "INSERT INTO [dbo].[language] ([id], [name]) VALUES (1, N'O''Neil, Jr');"
    );
  });

  it('honours a literal override', () => {
    expect(
      buildExportContent({
        ...base,
        format: 'sql',
        rows: [['0xFF', 'x']],
        toLiteral: value => String(value),
      })
    ).toContain('VALUES (0xFF, x);');
  });

  it('rejects unknown formats', () => {
    expect(() => buildExportContent({ ...base, format: 'xml' })).toThrow(
      'Invalid format'
    );
  });
});
