import { describe, expect, it } from 'vitest';
import {
  buildDeleteStatements,
  buildInsertStatements,
  buildUpdateStatements,
  normalizeEditedCellValue,
  toSqlLiteral,
} from '~/components/modules/quick-query/utils';

describe('QuickQuery value normalization and SQL builders', () => {
  describe('normalizeEditedCellValue', () => {
    it('serializes json arrays as JSON arrays, not indexed objects', () => {
      expect(
        normalizeEditedCellValue({
          fieldType: 'jsonb',
          isObjectColumn: true,
          value: ['a', 'b', 'c'],
        })
      ).toBe('["a","b","c"]');
    });

    it('does not double-stringify already stringified JSON', () => {
      expect(
        normalizeEditedCellValue({
          fieldType: 'jsonb',
          isObjectColumn: true,
          value: '{"a":1}',
        })
      ).toBe('{"a":1}');
    });

    it('maps empty editable values to null', () => {
      expect(
        normalizeEditedCellValue({
          fieldType: 'text',
          isObjectColumn: false,
          value: '',
        })
      ).toBeNull();
    });

    it('parses boolean string values safely', () => {
      expect(
        normalizeEditedCellValue({
          fieldType: 'bool',
          isObjectColumn: false,
          value: 'true',
        })
      ).toBe(true);

      expect(
        normalizeEditedCellValue({
          fieldType: 'bool',
          isObjectColumn: false,
          value: 'false',
        })
      ).toBe(false);
    });

    it('returns null for empty string even in boolean columns', () => {
      expect(
        normalizeEditedCellValue({
          fieldType: 'bool',
          isObjectColumn: false,
          value: '',
        })
      ).toBeNull();
    });
  });

  describe('toSqlLiteral', () => {
    it('preserves booleans, nulls, numbers, strings and JSON safely', () => {
      expect(toSqlLiteral(null)).toBe('NULL');
      expect(toSqlLiteral(true)).toBe('TRUE');
      expect(toSqlLiteral(false)).toBe('FALSE');
      expect(toSqlLiteral(42)).toBe('42');
      expect(toSqlLiteral("O'Hara")).toBe("'O''Hara'");
      expect(toSqlLiteral(['a', 'b'])).toBe('\'["a","b"]\'');
      expect(toSqlLiteral({ role: "O'Hara" })).toBe(
        `'${JSON.stringify({ role: "O'Hara" }).replace(/'/g, "''")}'`
      );
    });

    it('preserves Date precision (milliseconds) and UTC Z', () => {
      const date = new Date('2026-05-11T10:00:00.123Z');
      expect(toSqlLiteral(date)).toBe("'2026-05-11 10:00:00.123Z'");
    });
  });

  describe('buildInsertStatements', () => {
    it('builds INSERT SQL with preserved typed literals', () => {
      expect(
        buildInsertStatements({
          schemaName: 'public',
          tableName: 'users',
          insertData: {
            name: "O'Hara",
            active: false,
            meta: '["a","b"]',
            age: 21,
            note: null,
          },
        })
      ).toBe(
        `INSERT INTO "public"."users" ("name", "active", "meta", "age", "note") VALUES ('O''Hara', FALSE, '["a","b"]', 21, NULL)`
      );
    });

    it('falls back to DEFAULT VALUES for empty inserts', () => {
      expect(
        buildInsertStatements({
          schemaName: 'public',
          tableName: 'users',
          insertData: {},
        })
      ).toBe('INSERT INTO "public"."users" DEFAULT VALUES');
    });
  });

  describe('buildUpdateStatements', () => {
    it('builds UPDATE SQL with escaped SET and WHERE values', () => {
      expect(
        buildUpdateStatements({
          schemaName: 'public',
          tableName: 'users',
          pKeys: ['id', 'tenant'],
          pKeyValue: { id: 7, tenant: "team'O" } as any,
          update: {
            meta: '["a","b"]',
            active: true,
            note: "O'Hara",
          },
        })
      ).toBe(
        `UPDATE "public"."users" SET "meta" = '["a","b"]', "active" = TRUE, "note" = 'O''Hara' WHERE "id" = 7 AND "tenant" = 'team''O'`
      );
    });
  });

  describe('buildDeleteStatements', () => {
    it('builds DELETE SQL with safely serialized key values', () => {
      expect(
        buildDeleteStatements({
          schemaName: 'public',
          tableName: 'users',
          pKeys: ['id', 'slug'],
          pKeyValue: { id: 7, slug: "ada's-row" } as any,
        })
      ).toBe(
        `DELETE FROM "public"."users" WHERE "id" = 7 AND "slug" = 'ada''s-row'`
      );
    });
  });
});
