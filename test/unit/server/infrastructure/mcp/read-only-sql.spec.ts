import { describe, expect, it } from 'vitest';
import {
  assertReadOnlySql,
  ReadOnlySqlError,
} from '~/server/infrastructure/mcp';

describe('assertReadOnlySql', () => {
  it.each([
    'SELECT * FROM users',
    "select id, name from users where name = 'delete me';",
    'WITH active AS (SELECT * FROM users) SELECT * FROM active',
    'SHOW TABLES',
    'EXPLAIN SELECT 1',
    'PRAGMA table_info(users)',
    'SELECT "update" FROM audit -- insert comment',
  ])('allows read statement: %s', sql => {
    expect(() => assertReadOnlySql(sql)).not.toThrow();
  });

  it.each([
    'DELETE FROM users',
    'UPDATE users SET name = 1',
    'DROP TABLE users',
    'WITH gone AS (DELETE FROM users RETURNING *) SELECT * FROM gone',
    'EXPLAIN ANALYZE DELETE FROM users',
    'SELECT * INTO backup FROM users',
    'SELECT * FROM users FOR UPDATE',
    'SELECT 1; DROP TABLE users',
    'PRAGMA journal_mode = WAL',
    '',
  ])('rejects: %s', sql => {
    expect(() => assertReadOnlySql(sql)).toThrow(ReadOnlySqlError);
  });

  it('strips trailing semicolons and comments', () => {
    expect(assertReadOnlySql('/* hi */ SELECT 1;')).toBe('SELECT 1');
  });
});
