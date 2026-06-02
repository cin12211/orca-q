import { setup, $fetch } from '@nuxt/test-utils/e2e';
import { describe, expect, it } from 'vitest';
import { redisBody } from '../support/redis-connection';

describe('Redis PubSub API E2E', async () => {
  await setup();

  // ─── overview.post ────────────────────────────────────────────────────
  describe('POST /api/redis/pubsub/overview', () => {
    it('returns pubsub overview', async () => {
      const res = await $fetch('/api/redis/pubsub/overview', {
        method: 'POST',
        body: redisBody(),
      });

      expect(res).toBeDefined();
      expect(typeof res).toBe('object');
    });
  });

  // ─── publish.post ─────────────────────────────────────────────────────
  describe('POST /api/redis/pubsub/publish', () => {
    it('publishes a message to a channel', async () => {
      const res = await $fetch('/api/redis/pubsub/publish', {
        method: 'POST',
        body: {
          ...redisBody(),
          channel: '__orcaq_test_channel__',
          payload: 'hello from e2e',
        },
      });

      expect(res).toBeDefined();
    });
  });
});
