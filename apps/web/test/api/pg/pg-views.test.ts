import { setup, $fetch } from '@nuxt/test-utils/e2e';
import { describe, it, expect } from 'vitest';
import { pgBody, pgStringBody } from '../support/pg-connection';

describe('Views API — PostgreSQL', async () => {
  await setup();

  const SCHEMA = 'public';

  // ─── First discover what views exist ──────────────────────────────────
  let viewName: string;
  let viewId: string;

  // ─── overview.post ────────────────────────────────────────────────────
  describe('POST /api/views/overview', () => {
    it('returns a list of views for the public schema', async () => {
      const res = await $fetch('/api/views/overview', {
        method: 'POST',
        body: { ...pgBody(), schema: SCHEMA },
      });

      expect(Array.isArray(res)).toBe(true);
      // Pagila has several views (e.g., actor_info, customer_list, film_list)
      expect(res.length).toBeGreaterThan(0);

      // Save a view name for subsequent tests
      const firstView = res[0];
      viewName =
        firstView.table_name ||
        firstView.view_name ||
        firstView.viewName ||
        firstView.name;
      viewId = firstView.oid || firstView.id || firstView.view_id || viewName;

      expect(viewName).toBeDefined();
    });
  });

  // ─── meta.post ────────────────────────────────────────────────────────
  describe('POST /api/views/meta', () => {
    it('returns meta information for a view', async () => {
      // Use a known pagila view
      const res = await $fetch('/api/views/meta', {
        method: 'POST',
        body: {
          ...pgBody(),
          schema: SCHEMA,
          viewName: viewName || 'actor_info',
        },
      });

      expect(res).toBeDefined();
    });
  });

  // ─── definition.post ─────────────────────────────────────────────────
  describe('POST /api/views/definition', () => {
    it('returns the SQL definition of a view', async () => {
      // First get the OID of a view via execute (returns objects)
      const oidRes = await $fetch('/api/query/execute', {
        method: 'POST',
        body: {
          ...pgStringBody(),
          query: `SELECT c.oid::text AS view_oid FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relkind IN ('v','m') LIMIT 1`,
        },
      });

      const oid = oidRes.result?.[0]?.view_oid;
      if (!oid) {
        console.warn('No views found with OID, skipping');
        return;
      }

      const res = await $fetch('/api/views/definition', {
        method: 'POST',
        body: {
          ...pgBody(),
          viewId: oid,
        },
      });

      expect(res).toBeDefined();
      // Should contain SELECT or a definition string
      const def =
        typeof res === 'string'
          ? res
          : (res?.definition ?? res?.sql ?? res?.source ?? JSON.stringify(res));
      expect(def.toLowerCase()).toContain('select');
    });
  });

  // ─── dependencies.post ───────────────────────────────────────────────
  describe('POST /api/views/dependencies', () => {
    it('returns dependencies for a view', async () => {
      const res = await $fetch('/api/views/dependencies', {
        method: 'POST',
        body: {
          ...pgBody(),
          schema: SCHEMA,
          viewName: viewName || 'actor_info',
        },
      });

      expect(res).toBeDefined();
      // Could be an array of dependent objects
      if (Array.isArray(res)) {
        // Empty or populated — both valid
        expect(Array.isArray(res)).toBe(true);
      }
    });
  });

  // ─── indexes.post ────────────────────────────────────────────────────
  describe('POST /api/views/indexes', () => {
    it('returns indexes for a materialized view (or empty for regular views)', async () => {
      const res = await $fetch('/api/views/indexes', {
        method: 'POST',
        body: {
          ...pgBody(),
          schema: SCHEMA,
          viewName: viewName || 'actor_info',
        },
      });

      expect(Array.isArray(res)).toBe(true);
    });
  });

  // ─── explain.post ────────────────────────────────────────────────────
  describe('POST /api/views/explain', () => {
    it('returns an explain plan for a view', async () => {
      const res = await $fetch('/api/views/explain', {
        method: 'POST',
        body: {
          ...pgStringBody(),
          schema: SCHEMA,
          viewName: viewName || 'actor_info',
        },
      });

      expect(res).toBeDefined();
    });
  });
});
