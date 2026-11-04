import { DatabaseClientType } from '#shared/constants/database-client-type';
import { duckdbDialect, getSqlDialect } from '#shared/sql-dialect';
import { describe, expect, it } from 'vitest';

describe('duckdbDialect', () => {
  it('is registered for the DuckDB client type', () => {
    expect(getSqlDialect(DatabaseClientType.DUCKDB)).toBe(duckdbDialect);
  });

  it('quotes identifiers with double quotes', () => {
    expect(duckdbDialect.qualifyTableName('a"b', 'sales')).toBe(
      '"sales"."a""b"'
    );
  });

  it('casts columns to VARCHAR for LIKE on any column type', () => {
    expect(duckdbDialect.castForLike('"id"')).toBe('CAST("id" AS VARCHAR)');
  });

  it('supports ILIKE and RETURNING', () => {
    expect(duckdbDialect.likeOperator(true)).toBe('ILIKE');
    expect(duckdbDialect.likeOperator(false)).toBe('LIKE');
    expect(duckdbDialect.supportsReturning()).toBe(true);
  });

  it.each([
    ['INTEGER', 'number'],
    ['VARCHAR', 'string'],
    ['DECIMAL(10,2)', 'string'],
    ['BIGINT', 'string'],
    ['BOOLEAN', 'boolean'],
    ['STRUCT(a INTEGER)', 'unknown'],
  ])('maps %s to %s', (typeName, expected) => {
    expect(duckdbDialect.mapDbTypeToTsType(typeName)).toBe(expected);
  });
});
