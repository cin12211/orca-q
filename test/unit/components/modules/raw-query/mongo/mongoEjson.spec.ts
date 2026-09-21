import { describe, expect, it } from 'vitest';
import {
  formatMongoEjsonConsoleValue,
  parseMongoEjsonVariables,
} from '~/components/modules/raw-query/mongo/utils/mongoEjson';

describe('Mongo raw query EJSON helpers', () => {
  it('parses Canonical EJSON variables into BSON values', () => {
    const variables = parseMongoEjsonVariables(
      '{"id":{"$oid":"65c19f4018898af31684c4a7"}}'
    );

    expect((variables.id as { toHexString: () => string }).toHexString()).toBe(
      '65c19f4018898af31684c4a7'
    );
  });

  it('formats Canonical EJSON console values as Mongo literals', () => {
    expect(
      formatMongoEjsonConsoleValue({
        createdAt: { $date: { $numberLong: '0' } },
      })
    ).toContain("ISODate('1970-01-01T00:00:00.000Z')");
  });
});
