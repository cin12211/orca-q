import { setup, $fetch } from '@nuxt/test-utils/e2e';
import { describe, expect, it } from 'vitest';
import { redisBody, redisStringBody } from '../support/redis-connection';

describe('Redis Browser API E2E', async () => {
  await setup();

  // ─── databases.post ───────────────────────────────────────────────────
  describe('POST /api/redis/browser/databases', () => {
    it('returns a list of databases with form connection', async () => {
      const res = await $fetch('/api/redis/browser/databases', {
        method: 'POST',
        body: redisBody(),
      });

      expect(res).toBeDefined();
      expect(Array.isArray(res)).toBe(true);
      expect(res.length).toBeGreaterThan(0);
    });

    it('returns a list of databases with string connection', async () => {
      const res = await $fetch('/api/redis/browser/databases', {
        method: 'POST',
        body: redisStringBody(),
      });

      expect(res).toBeDefined();
      expect(Array.isArray(res)).toBe(true);
    });
  });

  // ─── index.post (browser landing: keys + databases) ───────────────────
  describe('POST /api/redis/browser', () => {
    it('returns keys and databases', async () => {
      const res = await $fetch('/api/redis/browser', {
        method: 'POST',
        body: {
          ...redisBody(),
          keyPattern: '*',
          cursor: '0',
        },
      });

      expect(res).toBeDefined();
      expect(res).toHaveProperty('databases');
      expect(Array.isArray(res.databases)).toBe(true);
    });

    it('supports keyPattern filtering', async () => {
      const res = await $fetch('/api/redis/browser', {
        method: 'POST',
        body: {
          ...redisBody(),
          keyPattern: 'nonexistent:*',
          cursor: '0',
        },
      });

      expect(res).toBeDefined();
      expect(res).toHaveProperty('databases');
    });
  });

  // ─── value.post (get key detail) ──────────────────────────────────────
  describe('POST /api/redis/browser/value', () => {
    it('returns detail for a non-existent key without crashing', async () => {
      const res = await $fetch('/api/redis/browser/value', {
        method: 'POST',
        body: {
          ...redisBody(),
          key: '__orcaq_nonexistent_key__',
        },
        ignoreResponseError: true,
      });

      expect(res).toBeDefined();
    });
  });
});
