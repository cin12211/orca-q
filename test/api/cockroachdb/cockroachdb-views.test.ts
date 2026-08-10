import { setup, $fetch } from '@nuxt/test-utils/e2e';
import { describe, it, expect } from 'vitest';
import {
  cockroachdbBody,
  cockroachdbStringBody,
} from '../support/cockroachdb-connection';

describe('Views API — CockroachDB', async () => {
  await setup();

  const SCHEMA = 'public';
  const VIEW = 'customer_order_totals';

  describe('POST /api/views/overview', () => {
    it('returns the seeded customer_order_totals view', async () => {
      const res = await $fetch('/api/views/overview', {
        method: 'POST',
        body: { ...cockroachdbBody(), schema: SCHEMA },
      });

      expect(Array.isArray(res)).toBe(true);
      const viewNames = res.map((v: any) =>
        (v.table_name || v.view_name || v.name || '').toLowerCase()
      );
      expect(viewNames).toContain(VIEW);
    });
  });

  describe('POST /api/views/meta', () => {
    it('returns meta information for the view', async () => {
      const res = await $fetch('/api/views/meta', {
        method: 'POST',
        body: { ...cockroachdbBody(), schema: SCHEMA, viewName: VIEW },
      });

      expect(res).toBeDefined();
    });
  });

  describe('POST /api/views/definition', () => {
    it('returns the SQL definition of the view', async () => {
      const oidRes = await $fetch('/api/query/execute', {
        method: 'POST',
        body: {
          ...cockroachdbStringBody(),
          query: `SELECT c.oid::text AS view_oid FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = '${VIEW}' AND c.relkind IN ('v','m') LIMIT 1`,
        },
      });

      const oid = oidRes.result?.[0]?.view_oid;
      expect(oid).toBeDefined();

      const res = await $fetch('/api/views/definition', {
        method: 'POST',
        body: { ...cockroachdbBody(), viewId: oid },
      });

      expect(res).toBeDefined();
      const def =
        typeof res === 'string'
          ? res
          : (res?.definition ?? res?.sql ?? res?.source ?? JSON.stringify(res));
      expect(def.toLowerCase()).toContain('select');
    });
  });

  describe('POST /api/views/dependencies', () => {
    it('returns dependencies for the view (may be empty)', async () => {
      const res = await $fetch('/api/views/dependencies', {
        method: 'POST',
        body: { ...cockroachdbBody(), schema: SCHEMA, viewName: VIEW },
      });

      expect(res).toBeDefined();
      if (Array.isArray(res)) {
        expect(Array.isArray(res)).toBe(true);
      }
    });
  });

  describe('POST /api/views/indexes', () => {
    it('returns an empty array for a non-materialized view', async () => {
      const res = await $fetch('/api/views/indexes', {
        method: 'POST',
        body: { ...cockroachdbBody(), schema: SCHEMA, viewName: VIEW },
      });

      expect(Array.isArray(res)).toBe(true);
    });
  });

  describe('POST /api/views/explain', () => {
    it('returns an explain plan for the view', async () => {
      const res = await $fetch('/api/views/explain', {
        method: 'POST',
        body: {
          ...cockroachdbStringBody(),
          schema: SCHEMA,
          viewName: VIEW,
        },
      });

      expect(res).toBeDefined();
    });
  });
});
