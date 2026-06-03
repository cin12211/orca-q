import { setup, $fetch } from '@nuxt/test-utils/e2e';
import { describe, expect, it } from 'vitest';
import { redisBody } from '../support/redis-connection';

describe('Redis Instance Insights API E2E', async () => {
  await setup();

  // ─── overview.post ────────────────────────────────────────────────────
  describe('POST /api/redis/instance-insights/overview', () => {
    it('returns instance overview', async () => {
      const res = await $fetch('/api/redis/instance-insights/overview', {
        method: 'POST',
        body: redisBody(),
      });

      expect(res).toBeDefined();
      expect(typeof res).toBe('object');
    });
  });
});
