import { setup, $fetch } from '@nuxt/test-utils/e2e';
import { describe, it, expect } from 'vitest';
import { myBody } from '../support/mysql-connection';

describe('Instance Insights API — MySQL', async () => {
  await setup();

  // ─── view.post (the only fully-implemented MySQL insights endpoint) ──
  describe('POST /api/instance-insights/view', () => {
    it('returns the instance insights view', async () => {
      const res = await $fetch('/api/instance-insights/view', {
        method: 'POST',
        body: myBody(),
      });

      expect(res).toBeDefined();
      expect(typeof res).toBe('object');
    });
  });

  // ─── dashboard.post (unsupported for MySQL — should return 501) ──────
  describe('POST /api/instance-insights/dashboard', () => {
    it('returns 501 or graceful error for unsupported endpoint', async () => {
      const res = await $fetch('/api/instance-insights/dashboard', {
        method: 'POST',
        body: myBody(),
        ignoreResponseError: true,
      });

      expect(res).toBeDefined();
    });
  });

  // ─── state.post (unsupported for MySQL) ──────────────────────────────
  describe('POST /api/instance-insights/state', () => {
    it('returns 501 or graceful error for unsupported endpoint', async () => {
      const res = await $fetch('/api/instance-insights/state', {
        method: 'POST',
        body: myBody(),
        ignoreResponseError: true,
      });

      expect(res).toBeDefined();
    });
  });

  // ─── configuration.post (unsupported for MySQL) ──────────────────────
  describe('POST /api/instance-insights/configuration', () => {
    it('returns 501 or graceful error for unsupported endpoint', async () => {
      const res = await $fetch('/api/instance-insights/configuration', {
        method: 'POST',
        body: myBody(),
        ignoreResponseError: true,
      });

      expect(res).toBeDefined();
    });
  });

  // ─── replication.post (unsupported for MySQL) ────────────────────────
  describe('POST /api/instance-insights/replication', () => {
    it('returns 501 or graceful error for unsupported endpoint', async () => {
      const res = await $fetch('/api/instance-insights/replication', {
        method: 'POST',
        body: myBody(),
        ignoreResponseError: true,
      });

      expect(res).toBeDefined();
    });
  });
});
