import { describe, expect, it } from 'vitest';
import { buildInsertStatements } from '~/components/modules/quick-query/utils/buildInsertStatements';

describe('buildInsertStatements', () => {
  it('builds DEFAULT VALUES insert for an empty new row', () => {
    expect(
      buildInsertStatements({
        schemaName: 'public',
        tableName: 'users',
        insertData: {},
      })
    ).toBe('INSERT INTO "public"."users" DEFAULT VALUES');
  });

  it('builds a standard insert when values are present', () => {
    expect(
      buildInsertStatements({
        schemaName: 'public',
        tableName: 'users',
        insertData: {
          id: 1,
          name: 'Alice',
        },
      })
    ).toBe('INSERT INTO "public"."users" ("id", "name") VALUES (1, \'Alice\')');
  });
});
