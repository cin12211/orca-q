import { describe, expect, it } from 'vitest';
import {
  formatMongoUtcDate,
  getMongoNodeType,
} from '~/components/modules/quick-query/mongodb/utils/mongoTypeUtils';

describe('mongoTypeUtils', () => {
  describe('getMongoNodeType', () => {
    it('returns null for closing brackets and root document container', () => {
      expect(
        getMongoNodeType({
          type: 'objectEnd',
          content: '}',
          level: 0,
        })
      ).toBeNull();

      expect(
        getMongoNodeType({
          type: 'arrayEnd',
          content: ']',
          level: 1,
        })
      ).toBeNull();

      expect(
        getMongoNodeType({
          type: 'objectStart',
          content: '{',
          level: 0,
          key: undefined,
          index: undefined,
        })
      ).toBeNull();
    });

    it('resolves BSON display literal types correctly', () => {
      expect(
        getMongoNodeType({
          type: 'content',
          content:
            "__orcaq_bson_literal__:ObjectId('65dc0bbc24edc357f3c23be1')",
          level: 1,
          key: '_id',
        })
      ).toBe('ObjectId');

      expect(
        getMongoNodeType({
          type: 'content',
          content: "__orcaq_bson_literal__:ISODate('2026-08-27T08:04:10.633Z')",
          level: 1,
          key: 'createdAt',
        })
      ).toBe('Date');

      expect(
        getMongoNodeType({
          type: 'content',
          content: "__orcaq_bson_literal__:Decimal128('12.50')",
          level: 1,
          key: 'amount',
        })
      ).toBe('Decimal128');

      expect(
        getMongoNodeType({
          type: 'content',
          content: '__orcaq_bson_literal__:Int32(42)',
          level: 1,
          key: 'count',
        })
      ).toBe('Int32');

      expect(
        getMongoNodeType({
          type: 'content',
          content: "__orcaq_bson_literal__:Long('9876543210')",
          level: 1,
          key: 'views',
        })
      ).toBe('Long');

      expect(
        getMongoNodeType({
          type: 'content',
          content: "__orcaq_bson_literal__:BinData(0, 'dGVzdA==')",
          level: 1,
          key: 'binaryData',
        })
      ).toBe('Binary');
    });

    it('resolves string literals without __orcaq_bson_literal__ prefix', () => {
      expect(
        getMongoNodeType({
          type: 'content',
          content: "ObjectId('65dc0bbc24edc357f3c23be1')",
          level: 1,
          key: '_id',
        })
      ).toBe('ObjectId');

      expect(
        getMongoNodeType({
          type: 'content',
          content: "ISODate('2026-08-27T08:04:10.633Z')",
          level: 1,
          key: 'updatedAt',
        })
      ).toBe('Date');
    });

    it('resolves structural types: Object and Array', () => {
      expect(
        getMongoNodeType({
          type: 'arrayStart',
          content: '[',
          level: 1,
          key: 'tags',
        })
      ).toBe('Array');

      expect(
        getMongoNodeType({
          type: 'arrayCollapsed',
          content: '[...]',
          level: 1,
          key: 'tags',
        })
      ).toBe('Array');

      expect(
        getMongoNodeType({
          type: 'objectStart',
          content: '{',
          level: 1,
          key: 'metadata',
        })
      ).toBe('Object');

      expect(
        getMongoNodeType({
          type: 'objectCollapsed',
          content: '{...}',
          level: 1,
          key: 'metadata',
        })
      ).toBe('Object');
    });

    it('resolves primitive types: String, Number, Boolean, Null', () => {
      expect(
        getMongoNodeType({
          type: 'content',
          content: 'Hello World',
          level: 1,
          key: 'title',
        })
      ).toBe('String');

      expect(
        getMongoNodeType({
          type: 'content',
          content: 100,
          level: 1,
          key: 'score',
        })
      ).toBe('Number');

      expect(
        getMongoNodeType({
          type: 'content',
          content: true,
          level: 1,
          key: 'isActive',
        })
      ).toBe('Boolean');

      expect(
        getMongoNodeType({
          type: 'content',
          content: null,
          level: 1,
          key: 'deletedAt',
        })
      ).toBe('Null');
    });

    it('resolves array item elements with index', () => {
      expect(
        getMongoNodeType({
          type: 'content',
          content: 'first_tag',
          level: 2,
          index: 0,
        })
      ).toBe('String');

      expect(
        getMongoNodeType({
          type: 'objectStart',
          content: '{',
          level: 2,
          index: 0,
        })
      ).toBe('Object');
    });
  });

  describe('formatMongoUtcDate', () => {
    it('formats standard ISODate string with milliseconds', () => {
      expect(formatMongoUtcDate("ISODate('2026-08-27T08:04:10.633Z')")).toBe(
        '2026-08-27 08:04:10.633 UTC'
      );
    });

    it('formats ISODate string with zero milliseconds without decimal part', () => {
      expect(formatMongoUtcDate("ISODate('2026-08-27T08:04:10.000Z')")).toBe(
        '2026-08-27 08:04:10 UTC'
      );
      expect(formatMongoUtcDate("ISODate('2026-08-27T08:04:10Z')")).toBe(
        '2026-08-27 08:04:10 UTC'
      );
    });

    it('formats double-quoted ISODate string', () => {
      expect(formatMongoUtcDate('ISODate("2026-08-27T08:04:10.633Z")')).toBe(
        '2026-08-27 08:04:10.633 UTC'
      );
    });

    it('formats ISODate with __orcaq_bson_literal__ prefix', () => {
      expect(
        formatMongoUtcDate(
          "__orcaq_bson_literal__:ISODate('2026-08-27T08:04:10.633Z')"
        )
      ).toBe('2026-08-27 08:04:10.633 UTC');
    });

    it('converts timezone offset to UTC correctly', () => {
      expect(
        formatMongoUtcDate("ISODate('2026-08-27T15:04:10.633+07:00')")
      ).toBe('2026-08-27 08:04:10.633 UTC');
    });

    it('formats numeric timestamp inside ISODate', () => {
      expect(formatMongoUtcDate('ISODate(1700000000000)')).toBe(
        '2023-11-14 22:13:20 UTC'
      );
    });

    it('returns null for invalid date strings', () => {
      expect(formatMongoUtcDate("ISODate('not-a-valid-date')")).toBeNull();
    });

    it('returns null for non-ISODate literals and other types', () => {
      expect(
        formatMongoUtcDate("ObjectId('65dc0bbc24edc357f3c23be1')")
      ).toBeNull();
      expect(formatMongoUtcDate('2026-08-27T08:04:10.633Z')).toBeNull();
      expect(formatMongoUtcDate(null)).toBeNull();
      expect(formatMongoUtcDate(undefined)).toBeNull();
      expect(formatMongoUtcDate(12345)).toBeNull();
      expect(formatMongoUtcDate({})).toBeNull();
    });
  });
});
