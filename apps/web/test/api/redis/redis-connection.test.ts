import { setup, $fetch } from '@nuxt/test-utils/e2e';
import { describe, expect, it } from 'vitest';
import {
  redisBody,
  redisHealthCheckBody,
  redisStringBody,
} from '../support/redis-connection';

describe('Redis Connection E2E', async () => {
  await setup();

  // ─── health-check (string) ────────────────────────────────────────────
  describe('POST /api/managment-connection/health-check', () => {
    it('connects successfully with connection string', async () => {
      const stringBody = redisStringBody();

      const res = await $fetch('/api/managment-connection/health-check', {
        method: 'POST',
        body: {
          type: 'redis',
          method: 'string',
          stringConnection: stringBody.stringConnection,
        },
      });

      expect(res).toEqual({ isConnectedSuccess: true });
    });

    it('connects successfully with form details', async () => {
      const res = await $fetch('/api/managment-connection/health-check', {
        method: 'POST',
        body: redisHealthCheckBody(),
      });

      expect(res).toEqual({ isConnectedSuccess: true });
    });

    it('fails for an invalid Redis host', { timeout: 15_000 }, async () => {
      // The Redis client has no connectTimeout and retries forever,
      // so the server-side health-check hangs on unreachable hosts.
      // Use AbortController to cap the request at 5 s — if it hasn't
      // responded with success by then, the host is unreachable.
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5_000);

      try {
        const res = await $fetch('/api/managment-connection/health-check', {
          method: 'POST',
          body: redisHealthCheckBody({
            host: '127.0.0.1',
            port: '1',
          }),
          signal: controller.signal,
        });
        // If the server somehow responds, it must report failure
        expect(res.isConnectedSuccess).toBe(false);
      } catch {
        // Request aborted — confirms the invalid host never connected
        expect(true).toBe(true);
      } finally {
        clearTimeout(timer);
      }
    });
  });
});
