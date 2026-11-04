import { describe, expect, it } from 'vitest';
import { formatMssqlType } from '~/server/infrastructure/database/adapters/metadata/mssql/mssql-catalog';

const column = (
  type_name: string,
  max_length = 0,
  precision = 0,
  scale = 0
) => ({
  type_name,
  max_length,
  precision,
  scale,
});

describe('formatMssqlType', () => {
  it('formats string and binary lengths', () => {
    expect(formatMssqlType(column('varchar', 255))).toBe('varchar(255)');
    expect(formatMssqlType(column('nvarchar', 100))).toBe('nvarchar(50)');
    expect(formatMssqlType(column('nvarchar', -1))).toBe('nvarchar(max)');
    expect(formatMssqlType(column('varbinary', -1))).toBe('varbinary(max)');
  });

  it('formats precision and scale', () => {
    expect(formatMssqlType(column('decimal', 5, 5, 2))).toBe('decimal(5,2)');
    expect(formatMssqlType(column('datetime2', 8, 27, 7))).toBe('datetime2(7)');
  });

  it('leaves fixed-size types alone', () => {
    expect(formatMssqlType(column('int', 4, 10))).toBe('int');
    expect(formatMssqlType(column('uniqueidentifier', 16))).toBe(
      'uniqueidentifier'
    );
  });
});
