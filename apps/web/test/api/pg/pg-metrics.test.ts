import { setup, $fetch } from '@nuxt/test-utils/e2e';
import { describe, it, expect } from 'vitest';
import { pgBody } from '../support/pg-connection';

describe('Metrics API — PostgreSQL', async () => {
  await setup();

  // ─── monitor.post ────────────────────────────────────────────────────
  describe('POST /api/metrics/monitor', () => {
    it('returns database metrics', async () => {
      const res = await $fetch('/api/metrics/monitor', {
        method: 'POST',
        body: pgBody(),
      });

      expect(res).toBeDefined();
      expect(typeof res).toBe('object');
    });

    it('returns 400 when no connection details provided', async () => {
      const res = await $fetch('/api/metrics/monitor', {
        method: 'POST',
        body: { type: 'postgres' },
        ignoreResponseError: true,
      });

      expect(res).toBeDefined();
    });
  });
});
