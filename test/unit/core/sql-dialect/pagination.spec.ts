import { describe, expect, it } from 'vitest';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { getSqlDialect } from '~/core/sql-dialect';

describe('SqlDialect pagination and ordering', () => {
  it('uses LIMIT/OFFSET by default', () => {
    const dialect = getSqlDialect(DatabaseClientType.POSTGRES);

    expect(dialect.buildPagination(100, 200)).toBe('LIMIT 100 OFFSET 200');
    expect(dialect.requiresOrderByForPagination()).toBe(false);
  });

  it('uses OFFSET/FETCH for SQL Server and requires an ORDER BY', () => {
    const dialect = getSqlDialect(DatabaseClientType.MSSQL);

    expect(dialect.buildPagination(50, 0)).toBe(
      'OFFSET 0 ROWS FETCH NEXT 50 ROWS ONLY'
    );
    expect(dialect.requiresOrderByForPagination()).toBe(true);
  });

  it('reports NULLS FIRST/LAST support per engine', () => {
    expect(
      getSqlDialect(DatabaseClientType.POSTGRES).supportsNullsOrdering()
    ).toBe(true);
    expect(
      getSqlDialect(DatabaseClientType.COCKROACHDB).supportsNullsOrdering()
    ).toBe(true);
    expect(
      getSqlDialect(DatabaseClientType.ORACLE).supportsNullsOrdering()
    ).toBe(true);
    expect(
      getSqlDialect(DatabaseClientType.MYSQL).supportsNullsOrdering()
    ).toBe(false);
    expect(
      getSqlDialect(DatabaseClientType.MSSQL).supportsNullsOrdering()
    ).toBe(false);
  });

  it('maps CockroachDB to the Postgres dialect', () => {
    expect(getSqlDialect(DatabaseClientType.COCKROACHDB)).toBe(
      getSqlDialect(DatabaseClientType.POSTGRES)
    );
  });

  it('writes SQL Server literals with N-prefixed strings and bit booleans', () => {
    const dialect = getSqlDialect(DatabaseClientType.MSSQL);

    expect(dialect.toLiteral("O'Brien")).toBe("N'O''Brien'");
    expect(dialect.toLiteral(true)).toBe('1');
    expect(dialect.toLiteral(false)).toBe('0');
    expect(dialect.toLiteral(null)).toBe('NULL');
    expect(dialect.quoteIdentifier('order]s')).toBe('[order]]s]');
  });
});
