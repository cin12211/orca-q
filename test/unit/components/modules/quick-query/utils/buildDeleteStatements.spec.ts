import { describe, expect, it } from 'vitest';
import {
  HASH_INDEX_ID,
  NEW_ROW_FLAG_ID,
} from '~/components/base/data-grid/constants';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { buildDeleteStatements } from '~/core/helpers/sql-mutation-statements';

describe('buildDeleteStatements', () => {
  it('builds a simple delete statement with PK', () => {
    const result = buildDeleteStatements({
      schemaName: 'public',
      tableName: 'users',
      pKeys: ['id'],
      pKeyValue: { id: '1', name: 'John' },
    });
    expect(result.sql).toBe('DELETE FROM "public"."users" WHERE "id" = \'1\'');
    expect(result.noPkWarning).toBe(false);
  });

  it('handles multiple PKs', () => {
    const result = buildDeleteStatements({
      schemaName: 'public',
      tableName: 'user_roles',
      pKeys: ['user_id', 'role_id'],
      pKeyValue: { user_id: '1', role_id: 'admin' },
    });
    expect(result.sql).toBe(
      'DELETE FROM "public"."user_roles" WHERE "user_id" = \'1\' AND "role_id" = \'admin\''
    );
    expect(result.noPkWarning).toBe(false);
  });

  it('falls back to all columns and sets noPkWarning when no PK is provided', () => {
    const result = buildDeleteStatements({
      schemaName: 'public',
      tableName: 'logs',
      pKeys: [],
      pKeyValue: { level: 'info', message: 'test' },
    });
    expect(result.sql).toBe(
      'DELETE FROM "public"."logs" WHERE "level" = \'info\' AND "message" = \'test\''
    );
    expect(result.noPkWarning).toBe(true);
  });

  it('handles NULL values in WHERE clause', () => {
    const result = buildDeleteStatements({
      schemaName: 'public',
      tableName: 'logs',
      pKeys: [],
      pKeyValue: { level: 'info', message: null },
    });
    expect(result.sql).toBe(
      'DELETE FROM "public"."logs" WHERE "level" = \'info\' AND "message" IS NULL'
    );
    expect(result.noPkWarning).toBe(true);
  });

  it('excludes quick-query row metadata when matching all columns without PK', () => {
    const result = buildDeleteStatements({
      schemaName: 'public',
      tableName: 'sample_data_types',
      pKeys: [],
      pKeyValue: {
        [HASH_INDEX_ID]: 5,
        [NEW_ROW_FLAG_ID]: true,
        id: '32a20c0a-6062-400d-9f83-f94494a2704b',
        tags: ['java', 'spring'],
      },
      dbType: DatabaseClientType.POSTGRES,
    });

    expect(result.sql).toBe(
      `DELETE FROM "public"."sample_data_types" WHERE "id" = '32a20c0a-6062-400d-9f83-f94494a2704b' AND "tags" = ARRAY['java', 'spring']`
    );
    expect(result.noPkWarning).toBe(true);
  });

  it('throws when tableName is missing', () => {
    expect(() =>
      buildDeleteStatements({
        schemaName: 'public',
        tableName: '',
        pKeys: ['id'],
        pKeyValue: { id: '1' },
      })
    ).toThrow('Invalid input: tableName is required');
  });

  it('throws when pKeyValue has no keys and pKeys is empty', () => {
    expect(() =>
      buildDeleteStatements({
        schemaName: 'public',
        tableName: 'logs',
        pKeys: [],
        pKeyValue: {},
      })
    ).toThrow('Invalid input: no columns to match for WHERE clause');
  });
});
