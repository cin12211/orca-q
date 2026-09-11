import { describe, expect, it } from 'vitest';
import {
  formatMongoEjsonValue,
  formatMongoDisplayJson,
  getMongoDocumentKey,
  toMongoDisplayDocument,
} from '~/components/modules/quick-query/mongodb/utils/mongoEjsonUtils';

describe('mongoEjsonUtils', () => {
  it('formats Canonical EJSON values in Compass-style notation', () => {
    expect(formatMongoEjsonValue({ $oid: '65c19f4018898af31684c4a7' })).toBe(
      "ObjectId('65c19f4018898af31684c4a7')"
    );
    expect(formatMongoEjsonValue({ $numberDecimal: '1.50' })).toBe(
      "Decimal128('1.50')"
    );
    expect(
      formatMongoEjsonValue({
        $regularExpression: { pattern: '^orca$', options: 'i' },
      })
    ).toBe("RegExp('^orca$', 'i')");
    expect(
      formatMongoEjsonValue({
        $date: { $numberLong: '1787817850633' },
      })
    ).toBe("ISODate('2026-08-27T08:04:10.633Z')");
    expect(formatMongoEjsonValue({ $numberLong: '9007199254740993' })).toBe(
      "Long('9007199254740993')"
    );
    expect(
      formatMongoEjsonValue({
        $binary: { base64: 'dGVzdA==', subType: '00' },
      })
    ).toBe("BinData(0, 'dGVzdA==')");
    expect(formatMongoEjsonValue({ $minKey: 1 })).toBe('MinKey()');
    expect(formatMongoEjsonValue({ $maxKey: 1 })).toBe('MaxKey()');
  });

  it('formats nested EJSON values without changing application objects', () => {
    expect(
      toMongoDisplayDocument({
        audit: { owner: { $oid: '65c19f4018898af31684c4a7' } },
        tags: ['orca'],
      })
    ).toEqual({
      audit: {
        owner: "__orcaq_bson_literal__:ObjectId('65c19f4018898af31684c4a7')",
      },
      tags: ['orca'],
    });
  });

  it('derives stable UI keys from Canonical EJSON ids', () => {
    expect(getMongoDocumentKey('doc-1')).toBe('doc-1');
    expect(getMongoDocumentKey({ $oid: '65c19f4018898af31684c4a7' })).toBe(
      '{"$oid":"65c19f4018898af31684c4a7"}'
    );
  });

  it('writes Compass-style literals without JSON quotes in code previews', () => {
    expect(
      formatMongoDisplayJson({
        owner: { $oid: '65c19f4018898af31684c4a7' },
        total: { $numberDecimal: '1.50' },
      })
    ).toBe(
      [
        '{',
        '  "owner": ObjectId(\'65c19f4018898af31684c4a7\'),',
        '  "total": Decimal128(\'1.50\')',
        '}',
      ].join('\n')
    );
  });

  it('parses document input with unquoted keys and ObjectId literals', async () => {
    const { parseMongoDocumentInput } = await import(
      '~/components/modules/quick-query/mongodb/utils/mongoEjsonUtils'
    );

    const input = `{\n  _id: ObjectId('6aa41a66635e05041887bac0'),\n  name: "Orca"\n}`;
    const parsed = parseMongoDocumentInput(input);
    expect(parsed).toEqual({
      _id: { $oid: '6aa41a66635e05041887bac0' },
      name: 'Orca',
    });
  });
});
