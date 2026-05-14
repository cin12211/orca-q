import { describe, expect, it } from 'vitest';
import { buildUpdateStatements } from '~/components/modules/quick-query/utils/buildUpdateStatements';

describe('buildUpdateStatements', () => {
  it('builds a simple update statement with PK', () => {
    const result = buildUpdateStatements({
      schemaName: 'public',
      tableName: 'users',
      pKeys: ['id'],
      pKeyValue: { id: '1' },
      update: { name: 'Jane' },
    });
    expect(result.sql).toBe(
      'UPDATE "public"."users" SET "name" = \'Jane\' WHERE "id" = \'1\''
    );
    expect(result.noPkWarning).toBe(false);
  });

  it('falls back to all columns and sets noPkWarning when no PK is provided', () => {
    const result = buildUpdateStatements({
      schemaName: 'public',
      tableName: 'logs',
      pKeys: [],
      pKeyValue: { level: 'info', message: 'test' },
      update: { level: 'debug' },
    });
    expect(result.sql).toBe(
      'UPDATE "public"."logs" SET "level" = \'debug\' WHERE "level" = \'info\' AND "message" = \'test\''
    );
    expect(result.noPkWarning).toBe(true);
  });

  it('handles NULL values in WHERE clause', () => {
    const result = buildUpdateStatements({
      schemaName: 'public',
      tableName: 'logs',
      pKeys: [],
      pKeyValue: { level: 'info', message: null },
      update: { level: 'debug' },
    });
    expect(result.sql).toBe(
      'UPDATE "public"."logs" SET "level" = \'debug\' WHERE "level" = \'info\' AND "message" IS NULL'
    );
    expect(result.noPkWarning).toBe(true);
  });

  it('handles multiple PKs in WHERE clause', () => {
    const result = buildUpdateStatements({
      schemaName: 'public',
      tableName: 'user_roles',
      pKeys: ['user_id', 'role_id'],
      pKeyValue: { user_id: '1', role_id: 'admin' },
      update: { role_id: 'editor' },
    });
    expect(result.sql).toBe(
      'UPDATE "public"."user_roles" SET "role_id" = \'editor\' WHERE "user_id" = \'1\' AND "role_id" = \'admin\''
    );
    expect(result.noPkWarning).toBe(false);
  });

  it('throws when tableName is missing', () => {
    expect(() =>
      buildUpdateStatements({
        schemaName: 'public',
        tableName: '',
        pKeys: ['id'],
        pKeyValue: { id: '1' },
        update: { name: 'Jane' },
      })
    ).toThrow('Invalid input: tableName and update object are required');
  });

  it('throws when update object is empty', () => {
    expect(() =>
      buildUpdateStatements({
        schemaName: 'public',
        tableName: 'users',
        pKeys: ['id'],
        pKeyValue: { id: '1' },
        update: {},
      })
    ).toThrow('Invalid input: tableName and update object are required');
  });
});
