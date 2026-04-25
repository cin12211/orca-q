import { describe, expect, it } from 'vitest';
import {
  buildWhereClause,
  formatWhereClause,
  getPlaceholderSearchByOperator,
  normalizeFilterSearchValue,
} from '~/components/modules/quick-query/utils';
import { ComposeOperator, EExtendedField, OperatorSet } from '~/core/constants';
import { DatabaseClientType } from '~/core/constants/database-client-type';

const createFilter = (
  overrides: Partial<{
    fieldName: string;
    isSelect: boolean;
    operator: string;
    search: ReturnType<typeof normalizeFilterSearchValue>;
  }> = {}
) => ({
  isSelect: true,
  fieldName: 'name',
  operator: OperatorSet.EQUAL,
  search: normalizeFilterSearchValue('john'),
  ...overrides,
});

const build = ({
  filters,
  db = DatabaseClientType.POSTGRES,
  columns = ['name', 'email', 'age'],
  composeWith,
}: {
  filters: ReturnType<typeof createFilter>[];
  db?: DatabaseClientType;
  columns?: readonly string[];
  composeWith?: ComposeOperator;
}) => buildWhereClause({ filters, db, columns, composeWith });

const format = ({
  filters,
  db = DatabaseClientType.POSTGRES,
  columns = ['name', 'email', 'age'],
  composeWith,
}: {
  filters: ReturnType<typeof createFilter>[];
  db?: DatabaseClientType;
  columns?: readonly string[];
  composeWith?: ComposeOperator;
}) => formatWhereClause({ filters, db, columns, composeWith });

describe('buildWhereClause', () => {
  describe('normalizeFilterSearchValue', () => {
    it('returns undefined for undefined', () => {
      expect(normalizeFilterSearchValue(undefined)).toBeUndefined();
    });

    it('keeps null values unchanged', () => {
      expect(normalizeFilterSearchValue(null)).toBeNull();
    });

    it('keeps boolean false unchanged', () => {
      expect(normalizeFilterSearchValue(false)).toBe(false);
    });

    it('converts bigint values to string', () => {
      expect(normalizeFilterSearchValue(9007199254740993n)).toBe(
        '9007199254740993'
      );
    });

    it('stringifies plain objects', () => {
      expect(normalizeFilterSearchValue({ id: 1, name: 'john' })).toBe(
        '{"id":1,"name":"john"}'
      );
    });

    it('stringifies arrays', () => {
      expect(normalizeFilterSearchValue(['a', 1, true])).toBe('["a",1,true]');
    });
  });

  describe('comparison operators', () => {
    it.each([
      [OperatorSet.EQUAL, 42, 'WHERE "age" = $1'],
      [OperatorSet.NOT_EQUAL, 42, 'WHERE "age" <> $1'],
      [OperatorSet.LESS, 18, 'WHERE "age" < $1'],
      [OperatorSet.GREATER, 18, 'WHERE "age" > $1'],
      [OperatorSet.LESS_EQUAL, 18, 'WHERE "age" <= $1'],
      [OperatorSet.GREATER_EQUAL, 18, 'WHERE "age" >= $1'],
    ])('builds %s clauses on Postgres', (operator, search, expectedWhere) => {
      const result = build({
        filters: [
          createFilter({
            fieldName: 'age',
            operator,
            search: normalizeFilterSearchValue(search),
          }),
        ],
      });

      expect(result).toEqual({ where: expectedWhere, params: [search] });
    });

    it('uses question-mark placeholders on MySQL', () => {
      const result = build({
        db: DatabaseClientType.MYSQL,
        filters: [
          createFilter({
            fieldName: 'age',
            operator: OperatorSet.EQUAL,
            search: normalizeFilterSearchValue(30),
          }),
        ],
      });

      expect(result).toEqual({ where: 'WHERE `age` = ?', params: [30] });
    });

    it('formats boolean true filters from context cells', () => {
      const sql = format({
        filters: [
          createFilter({
            fieldName: 'is_active',
            operator: OperatorSet.EQUAL,
            search: normalizeFilterSearchValue(true),
          }),
        ],
        columns: ['is_active'],
      });

      expect(sql).toBe('WHERE "is_active" = TRUE');
    });

    it('formats boolean false filters without dropping the value', () => {
      const sql = format({
        filters: [
          createFilter({
            fieldName: 'is_active',
            operator: OperatorSet.EQUAL,
            search: normalizeFilterSearchValue(false),
          }),
        ],
        columns: ['is_active'],
      });

      expect(sql).toBe('WHERE "is_active" = FALSE');
    });
  });

  describe('null, list and range operators', () => {
    it('builds IS NULL without params', () => {
      const result = build({
        filters: [createFilter({ operator: OperatorSet.IS_NULL })],
      });

      expect(result).toEqual({ where: 'WHERE "name" IS NULL', params: [] });
    });

    it('builds IS NOT NULL without params', () => {
      const result = build({
        filters: [createFilter({ operator: OperatorSet.IS_NOT_NULL })],
      });

      expect(result).toEqual({
        where: 'WHERE "name" IS NOT NULL',
        params: [],
      });
    });

    it('builds IN clauses with trimmed values on Postgres', () => {
      const result = build({
        filters: [
          createFilter({
            fieldName: 'status',
            operator: OperatorSet.IN,
            search: normalizeFilterSearchValue('draft, published, archived'),
          }),
        ],
      });

      expect(result).toEqual({
        where: 'WHERE "status" IN ($1, $2, $3)',
        params: ['draft', 'published', 'archived'],
      });
    });

    it('builds NOT IN clauses on MySQL', () => {
      const result = build({
        db: DatabaseClientType.MYSQL,
        filters: [
          createFilter({
            fieldName: 'status',
            operator: OperatorSet.NOT_IN,
            search: normalizeFilterSearchValue('draft,published'),
          }),
        ],
      });

      expect(result).toEqual({
        where: 'WHERE `status` NOT IN (?, ?)',
        params: ['draft', 'published'],
      });
    });

    it('removes empty items from IN lists', () => {
      const result = build({
        filters: [
          createFilter({
            fieldName: 'status',
            operator: OperatorSet.IN,
            search: normalizeFilterSearchValue('draft, , published,   '),
          }),
        ],
      });

      expect(result).toEqual({
        where: 'WHERE "status" IN ($1, $2)',
        params: ['draft', 'published'],
      });
    });

    it('skips empty IN filters entirely', () => {
      const result = build({
        filters: [
          createFilter({
            fieldName: 'status',
            operator: OperatorSet.IN,
            search: normalizeFilterSearchValue(' , , '),
          }),
        ],
      });

      expect(result).toEqual({ where: '', params: [] });
    });

    it('builds BETWEEN as a raw range fragment', () => {
      const result = build({
        filters: [
          createFilter({
            fieldName: 'age',
            operator: OperatorSet.BETWEEN,
            search: normalizeFilterSearchValue('18 AND 30'),
          }),
        ],
      });

      expect(result).toEqual({
        where: 'WHERE "age" BETWEEN 18 AND 30',
        params: [],
      });
    });

    it('builds NOT BETWEEN as a raw range fragment', () => {
      const result = build({
        filters: [
          createFilter({
            fieldName: 'created_at',
            operator: OperatorSet.NOT_BETWEEN,
            search: normalizeFilterSearchValue('2024-01-01 AND 2024-12-31'),
          }),
        ],
      });

      expect(result).toEqual({
        where: 'WHERE "created_at" NOT BETWEEN 2024-01-01 AND 2024-12-31',
        params: [],
      });
    });
  });

  describe('LIKE and ILIKE operators', () => {
    it.each([
      [
        OperatorSet.LIKE,
        DatabaseClientType.POSTGRES,
        'john',
        'WHERE "name"::TEXT  LIKE $1',
        ['john'],
      ],
      [
        OperatorSet.ILIKE,
        DatabaseClientType.POSTGRES,
        'John',
        'WHERE "name"::TEXT  ILIKE $1',
        ['John'],
      ],
      [
        OperatorSet.ILIKE,
        DatabaseClientType.MYSQL,
        'John',
        'WHERE `name`  LIKE ?',
        ['%John%'],
      ],
      [
        OperatorSet.LIKE_CONTAINS,
        DatabaseClientType.POSTGRES,
        'john',
        'WHERE "name"::TEXT  LIKE $1',
        ['%john%'],
      ],
      [
        OperatorSet.LIKE_PREFIX,
        DatabaseClientType.POSTGRES,
        'john',
        'WHERE "name"::TEXT  LIKE $1',
        ['john%'],
      ],
      [
        OperatorSet.LIKE_SUFFIX,
        DatabaseClientType.POSTGRES,
        'john',
        'WHERE "name"::TEXT  LIKE $1',
        ['%john'],
      ],
      [
        OperatorSet.ILIKE_CONTAINS,
        DatabaseClientType.POSTGRES,
        'John',
        'WHERE "name"::TEXT  ILIKE $1',
        ['%John%'],
      ],
      [
        OperatorSet.ILIKE_PREFIX,
        DatabaseClientType.POSTGRES,
        'John',
        'WHERE "name"::TEXT  ILIKE $1',
        ['John%'],
      ],
      [
        OperatorSet.ILIKE_SUFFIX,
        DatabaseClientType.POSTGRES,
        'John',
        'WHERE "name"::TEXT  ILIKE $1',
        ['%John'],
      ],
      [
        OperatorSet.NOT_LIKE_CONTAINS,
        DatabaseClientType.POSTGRES,
        'john',
        'WHERE "name"::TEXT  NOT LIKE $1',
        ['%john%'],
      ],
      [
        OperatorSet.NOT_ILIKE_CONTAINS,
        DatabaseClientType.POSTGRES,
        'John',
        'WHERE "name"::TEXT  NOT LIKE $1',
        ['%John%'],
      ],
    ])(
      'builds %s for %s',
      (operator, db, search, expectedWhere, expectedParams) => {
        const result = build({
          db,
          filters: [
            createFilter({
              operator,
              search: normalizeFilterSearchValue(search),
            }),
          ],
        });

        expect(result).toEqual({
          where: expectedWhere,
          params: expectedParams,
        });
      }
    );

    it('falls back to LIKE contains when the operator is unsupported for the db', () => {
      const result = build({
        db: DatabaseClientType.MYSQL,
        filters: [
          createFilter({
            operator: OperatorSet.NOT_ILIKE_SUFFIX,
            search: normalizeFilterSearchValue('John'),
          }),
        ],
      });

      expect(result).toEqual({
        where: 'WHERE `name`  LIKE ?',
        params: ['%John%'],
      });
    });

    it('normalizes lowercase operators before building clauses', () => {
      const result = build({
        filters: [
          createFilter({
            operator: 'is null',
            search: normalizeFilterSearchValue('ignored'),
          }),
        ],
      });

      expect(result).toEqual({ where: 'WHERE "name" IS NULL', params: [] });
    });
  });

  describe('extended fields and composition', () => {
    it('builds OR expressions for Any field comparison filters', () => {
      const result = build({
        filters: [
          createFilter({
            fieldName: EExtendedField.AnyField,
            operator: OperatorSet.EQUAL,
            search: normalizeFilterSearchValue('john'),
          }),
        ],
        columns: ['name', 'email'],
      });

      expect(result).toEqual({
        where: 'WHERE ("name" = $1 OR "email" = $2)',
        params: ['john', 'john'],
      });
    });

    it('builds OR expressions for Any field IN filters', () => {
      const result = build({
        filters: [
          createFilter({
            fieldName: EExtendedField.AnyField,
            operator: OperatorSet.IN,
            search: normalizeFilterSearchValue('draft,published'),
          }),
        ],
        columns: ['name', 'email'],
      });

      expect(result).toEqual({
        where: 'WHERE ("name" IN ($1, $2) OR "email" IN ($3, $4))',
        params: ['draft', 'published', 'draft', 'published'],
      });
    });

    it('skips Any field filters when no column produces a fragment', () => {
      const result = build({
        filters: [
          createFilter({
            fieldName: EExtendedField.AnyField,
            operator: OperatorSet.IN,
            search: normalizeFilterSearchValue(' , '),
          }),
        ],
        columns: ['name', 'email'],
      });

      expect(result).toEqual({ where: '', params: [] });
    });

    it('embeds raw query filters directly', () => {
      const result = build({
        filters: [
          createFilter({
            fieldName: EExtendedField.RawQuery,
            operator: OperatorSet.EQUAL,
            search: normalizeFilterSearchValue('age > 18'),
          }),
        ],
      });

      expect(result).toEqual({ where: 'WHERE (age > 18)', params: [] });
    });

    it('ignores empty raw query filters', () => {
      const result = build({
        filters: [
          createFilter({
            fieldName: EExtendedField.RawQuery,
            search: normalizeFilterSearchValue(''),
          }),
        ],
      });

      expect(result).toEqual({ where: '', params: [] });
    });

    it('ignores filters that are not selected', () => {
      const result = build({
        filters: [
          createFilter({
            isSelect: false,
            fieldName: 'age',
            operator: OperatorSet.GREATER,
            search: normalizeFilterSearchValue(18),
          }),
        ],
      });

      expect(result).toEqual({ where: '', params: [] });
    });

    it('uses OR to join multiple filters when composeWith is OR', () => {
      const result = build({
        composeWith: ComposeOperator.OR,
        filters: [
          createFilter({
            fieldName: 'name',
            operator: OperatorSet.EQUAL,
            search: normalizeFilterSearchValue('john'),
          }),
          createFilter({
            fieldName: 'age',
            operator: OperatorSet.GREATER_EQUAL,
            search: normalizeFilterSearchValue(18),
          }),
        ],
      });

      expect(result).toEqual({
        where: 'WHERE "name" = $1 OR "age" >= $2',
        params: ['john', 18],
      });
    });

    it('increments placeholders across multiple filters', () => {
      const result = build({
        filters: [
          createFilter({
            fieldName: 'name',
            operator: OperatorSet.EQUAL,
            search: normalizeFilterSearchValue('john'),
          }),
          createFilter({
            fieldName: 'status',
            operator: OperatorSet.IN,
            search: normalizeFilterSearchValue('draft,published'),
          }),
        ],
      });

      expect(result).toEqual({
        where: 'WHERE "name" = $1 AND "status" IN ($2, $3)',
        params: ['john', 'draft', 'published'],
      });
    });
  });

  describe('formatWhereClause', () => {
    it('escapes single quotes in string values', () => {
      const sql = format({
        filters: [
          createFilter({
            operator: OperatorSet.EQUAL,
            search: normalizeFilterSearchValue("O'Brien"),
          }),
        ],
      });

      expect(sql).toBe("WHERE \"name\" = 'O''Brien'");
    });

    it('substitutes multiple MySQL placeholders in order', () => {
      const sql = format({
        db: DatabaseClientType.MYSQL,
        filters: [
          createFilter({
            fieldName: 'name',
            operator: OperatorSet.EQUAL,
            search: normalizeFilterSearchValue('john'),
          }),
          createFilter({
            fieldName: 'age',
            operator: OperatorSet.GREATER,
            search: normalizeFilterSearchValue(18),
          }),
        ],
      });

      expect(sql).toBe("WHERE `name` = 'john' AND `age` > 18");
    });
  });

  describe('getPlaceholderSearchByOperator', () => {
    it.each([
      [OperatorSet.IS_NULL, ''],
      [OperatorSet.IS_NOT_NULL, ''],
      [OperatorSet.IN, 'value1,value2,value3'],
      [OperatorSet.NOT_IN, 'value1,value2,value3'],
      [OperatorSet.BETWEEN, 'value1 AND value2'],
      [OperatorSet.NOT_BETWEEN, 'value1 AND value2'],
      [OperatorSet.LIKE_CONTAINS, 'contains'],
      [OperatorSet.LIKE_PREFIX, 'prefix*'],
      [OperatorSet.LIKE_SUFFIX, '*suffix'],
      [OperatorSet.EQUAL, 'value'],
    ])('returns %s placeholder hint', (operator, expected) => {
      expect(getPlaceholderSearchByOperator(operator)).toBe(expected);
    });
  });
});
