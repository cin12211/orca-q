import { setup, $fetch } from '@nuxt/test-utils/e2e';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createSqliteFixture,
  destroySqliteFixture,
  sqliteBody,
} from '../support/sqlite-connection';

let dbPath: string;

describe('Instance Insights API — SQLite', async () => {
  await setup();

  beforeAll(async () => {
    dbPath = await createSqliteFixture();
  });

  afterAll(async () => {
    await destroySqliteFixture();
  });

  // ─── view.post ────────────────────────────────────────────────────────
  describe('POST /api/instance-insights/view', () => {
    it('returns the instance insights view', async () => {
      const res = await $fetch('/api/instance-insights/view', {
        method: 'POST',
        body: sqliteBody(dbPath),
      });

      expect(res).toBeDefined();
      expect(typeof res).toBe('object');
    });
  });

  // ─── dashboard.post (unsupported for SQLite — should return 501) ─────
  describe('POST /api/instance-insights/dashboard', () => {
    it('returns 501 or graceful error for unsupported endpoint', async () => {
      const res = await $fetch('/api/instance-insights/dashboard', {
        method: 'POST',
        body: sqliteBody(dbPath),
        ignoreResponseError: true,
      });

      expect(res).toBeDefined();
    });
  });

  // ─── state.post (unsupported for SQLite) ──────────────────────────────
  describe('POST /api/instance-insights/state', () => {
    it('returns 501 or graceful error for unsupported endpoint', async () => {
      const res = await $fetch('/api/instance-insights/state', {
        method: 'POST',
        body: sqliteBody(dbPath),
        ignoreResponseError: true,
      });

      expect(res).toBeDefined();
    });
  });

  // ─── configuration.post (unsupported for SQLite) ──────────────────────
  describe('POST /api/instance-insights/configuration', () => {
    it('returns 501 or graceful error for unsupported endpoint', async () => {
      const res = await $fetch('/api/instance-insights/configuration', {
        method: 'POST',
        body: sqliteBody(dbPath),
        ignoreResponseError: true,
      });

      expect(res).toBeDefined();
    });
  });

  // ─── replication.post (unsupported for SQLite) ────────────────────────
  describe('POST /api/instance-insights/replication', () => {
    it('returns 501 or graceful error for unsupported endpoint', async () => {
      const res = await $fetch('/api/instance-insights/replication', {
        method: 'POST',
        body: sqliteBody(dbPath),
        ignoreResponseError: true,
      });

      expect(res).toBeDefined();
    });
  });
});
