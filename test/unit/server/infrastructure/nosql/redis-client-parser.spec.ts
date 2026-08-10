import { describe, expect, it } from 'vitest';
import { parseRedisDatabaseIndex } from '~/server/infrastructure/nosql/redis/redis.client';

describe('parseRedisDatabaseIndex (server redis client)', () => {
  it('parses direct numeric database index string', () => {
    expect(parseRedisDatabaseIndex('0')).toBe(0);
    expect(parseRedisDatabaseIndex('2')).toBe(2);
    expect(parseRedisDatabaseIndex('10')).toBe(10);
  });

  it('parses redis:// and rediss:// connection strings in value parameter', () => {
    expect(parseRedisDatabaseIndex('redis://127.0.0.1:6379/1')).toBe(1);
    expect(parseRedisDatabaseIndex('rediss://:secret@cache.example.com:6380/6')).toBe(6);
  });

  it('falls back to url parameter when value is missing or empty', () => {
    expect(parseRedisDatabaseIndex(undefined, 'redis://127.0.0.1:6379/3')).toBe(3);
    expect(parseRedisDatabaseIndex('', 'redis://127.0.0.1:6379/11')).toBe(11);
  });

  it('falls back to url when value is non-numeric non-URL string', () => {
    expect(parseRedisDatabaseIndex('invalid', 'redis://127.0.0.1:6379/5')).toBe(5);
  });

  it('defaults to 0 when input is missing or malformed', () => {
    expect(parseRedisDatabaseIndex()).toBe(0);
    expect(parseRedisDatabaseIndex('')).toBe(0);
    expect(parseRedisDatabaseIndex('invalid', 'invalid')).toBe(0);
  });
});
