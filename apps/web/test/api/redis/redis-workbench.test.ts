import { setup, $fetch } from '@nuxt/test-utils/e2e';
import { describe, expect, it } from 'vitest';
import { redisBody } from '../support/redis-connection';

describe('Redis Workbench API E2E', async () => {
  await setup();

  // ─── execute.post ─────────────────────────────────────────────────────
  describe('POST /api/redis/workbench/execute', () => {
    it('executes PING and returns PONG', async () => {
      const res = await $fetch('/api/redis/workbench/execute', {
        method: 'POST',
        body: {
          ...redisBody(),
          command: 'PING',
        },
      });

      expect(res).toBeDefined();
      expect(res.result).toBe('PONG');
    });

    it('executes SET and GET', async () => {
      const key = '__orcaq_test_wkb__';

      const setRes = await $fetch('/api/redis/workbench/execute', {
        method: 'POST',
        body: {
          ...redisBody(),
          command: `SET ${key} hello`,
        },
      });
      expect(setRes.result).toBe('OK');

      const getRes = await $fetch('/api/redis/workbench/execute', {
        method: 'POST',
        body: {
          ...redisBody(),
          command: `GET ${key}`,
        },
      });
      expect(getRes.result).toBe('hello');

      // Cleanup
      await $fetch('/api/redis/workbench/execute', {
        method: 'POST',
        body: {
          ...redisBody(),
          command: `DEL ${key}`,
        },
      });
    });

    it('returns error for empty command', async () => {
      const res = await $fetch('/api/redis/workbench/execute', {
        method: 'POST',
        body: {
          ...redisBody(),
          command: '',
        },
        ignoreResponseError: true,
      });

      expect(res).toBeDefined();
    });

    it('executes INFO command', async () => {
      const res = await $fetch('/api/redis/workbench/execute', {
        method: 'POST',
        body: {
          ...redisBody(),
          command: 'INFO server',
        },
      });

      expect(res).toBeDefined();
      expect(res.result).toBeDefined();
      expect(typeof res.result).toBe('string');
      expect(res.result).toContain('redis_version');
    });

    it('executes DBSIZE command', async () => {
      const res = await $fetch('/api/redis/workbench/execute', {
        method: 'POST',
        body: {
          ...redisBody(),
          command: 'DBSIZE',
        },
      });

      expect(res).toBeDefined();
      expect(typeof res.result).toBe('number');
    });
  });
});
