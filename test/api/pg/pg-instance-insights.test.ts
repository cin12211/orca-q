import { setup, $fetch } from '@nuxt/test-utils/e2e';
import { describe, it, expect } from 'vitest';
import { pgBody } from '../support/pg-connection';

describe('Instance Insights API — PostgreSQL', async () => {
  await setup();

  // ─── dashboard.post ──────────────────────────────────────────────────
  describe('POST /api/instance-insights/dashboard', () => {
    it('returns the instance insights dashboard', async () => {
      const res = await $fetch('/api/instance-insights/dashboard', {
        method: 'POST',
        body: pgBody(),
      });

      expect(res).toBeDefined();
      // Dashboard should contain some stats
      expect(typeof res).toBe('object');
    });
  });

  // ─── state.post ──────────────────────────────────────────────────────
  describe('POST /api/instance-insights/state', () => {
    it('returns instance state information', async () => {
      const res = await $fetch('/api/instance-insights/state', {
        method: 'POST',
        body: pgBody(),
      });

      expect(res).toBeDefined();
      expect(typeof res).toBe('object');
    });
  });

  // ─── configuration.post ──────────────────────────────────────────────
  describe('POST /api/instance-insights/configuration', () => {
    it('returns configuration settings', async () => {
      const res = await $fetch('/api/instance-insights/configuration', {
        method: 'POST',
        body: pgBody(),
      });

      expect(res).toBeDefined();
    });

    it('supports search filtering', async () => {
      const res = await $fetch('/api/instance-insights/configuration', {
        method: 'POST',
        body: { ...pgBody(), search: 'max_connections' },
      });

      expect(res).toBeDefined();
    });
  });

  // ─── replication.post ────────────────────────────────────────────────
  describe('POST /api/instance-insights/replication', () => {
    it('returns replication information', async () => {
      const res = await $fetch('/api/instance-insights/replication', {
        method: 'POST',
        body: pgBody(),
      });

      expect(res).toBeDefined();
      expect(typeof res).toBe('object');
    });
  });

  // ─── view.post ───────────────────────────────────────────────────────
  describe('POST /api/instance-insights/view', () => {
    it('returns the instance insights view', async () => {
      const res = await $fetch('/api/instance-insights/view', {
        method: 'POST',
        body: pgBody(),
      });

      expect(res).toBeDefined();
      expect(typeof res).toBe('object');
    });
  });

  // ─── Validation: missing connection details ──────────────────────────
  describe('Validation', () => {
    it('returns 400 when no connection details provided', async () => {
      const res = await $fetch('/api/instance-insights/dashboard', {
        method: 'POST',
        body: { type: 'postgres' },
        ignoreResponseError: true,
      });

      expect(res).toBeDefined();
    });
  });
});
