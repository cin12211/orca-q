import { describe, expect, it } from 'vitest';
import { parseRedisDatabaseIndex } from '~/components/modules/redis-workspace/utils/redisWorkspace';

describe('parseRedisDatabaseIndex (frontend util)', () => {
  it('parses numeric string database values', () => {
    expect(parseRedisDatabaseIndex('0')).toBe(0);
    expect(parseRedisDatabaseIndex('5')).toBe(5);
    expect(parseRedisDatabaseIndex('15')).toBe(15);
  });

  it('parses redis:// and rediss:// connection strings passed as value', () => {
    expect(parseRedisDatabaseIndex('redis://localhost:6379/3')).toBe(3);
    expect(parseRedisDatabaseIndex('rediss://username:password@localhost:6379/8')).toBe(8);
  });

  it('falls back to connectionString when value is empty, null, or undefined', () => {
    expect(parseRedisDatabaseIndex(undefined, 'redis://localhost:6379/4')).toBe(4);
    expect(parseRedisDatabaseIndex(null, 'redis://localhost:6379/7')).toBe(7);
    expect(parseRedisDatabaseIndex('', 'redis://localhost:6379/9')).toBe(9);
  });

  it('falls back to connectionString when value is non-numeric non-URL string', () => {
    expect(parseRedisDatabaseIndex('invalid', 'redis://localhost:6379/2')).toBe(2);
  });

  it('returns 0 default when both inputs are invalid or missing', () => {
    expect(parseRedisDatabaseIndex(undefined, undefined)).toBe(0);
    expect(parseRedisDatabaseIndex(null, null)).toBe(0);
    expect(parseRedisDatabaseIndex('invalid', 'invalid')).toBe(0);
    expect(parseRedisDatabaseIndex('')).toBe(0);
  });
});
