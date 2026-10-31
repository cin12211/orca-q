import { describe, expect, it } from 'vitest';
import { OperatorSet } from '~/core/constants';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { formatWhereClause } from '~/core/helpers/sql-where-clause';

const filter = (fieldName: string, operator: OperatorSet, search: string) => ({
  isSelect: true,
  fieldName,
  operator,
  search,
});

describe('formatWhereClause placeholder substitution', () => {
  it('inlines SQL Server @pN placeholders', () => {
    const where = formatWhereClause({
      db: DatabaseClientType.MSSQL,
      columns: ['title', 'rating'],
      filters: [
        filter('title', OperatorSet.LIKE_CONTAINS, 'ACE'),
        filter('rating', OperatorSet.EQUAL, 'PG'),
      ],
    });

    expect(where).toBe(
      "WHERE CAST([title] AS NVARCHAR(MAX))  LIKE N'%ACE%' AND [rating] = N'PG'"
    );
  });

  it('inlines Oracle :N placeholders', () => {
    const where = formatWhereClause({
      db: DatabaseClientType.ORACLE,
      columns: ['TITLE'],
      filters: [filter('TITLE', OperatorSet.EQUAL, 'X')],
    });

    expect(where).toBe(`WHERE "TITLE" = 'X'`);
  });

  it('does not re-substitute placeholder-like text inside values', () => {
    const where = formatWhereClause({
      db: DatabaseClientType.POSTGRES,
      columns: ['a', 'b'],
      filters: [
        filter('a', OperatorSet.EQUAL, '$2'),
        filter('b', OperatorSet.EQUAL, 'second'),
      ],
    });

    expect(where).toBe(`WHERE "a" = '$2' AND "b" = 'second'`);
  });

  it('keeps ILIKE for CockroachDB', () => {
    const where = formatWhereClause({
      db: DatabaseClientType.COCKROACHDB,
      columns: ['title'],
      filters: [filter('title', OperatorSet.ILIKE_CONTAINS, 'ace')],
    });

    expect(where).toBe(`WHERE "title"::TEXT  ILIKE '%ace%'`);
  });
});
