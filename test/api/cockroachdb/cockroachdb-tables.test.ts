import { setup, $fetch } from '@nuxt/test-utils/e2e';
import { describe, it, expect } from 'vitest';
import { cockroachdbBody } from '../support/cockroachdb-connection';

describe('Tables API — CockroachDB', async () => {
  await setup();

  const SCHEMA = 'public';
  const TABLE = 'customers';

  describe('POST /api/tables/overview', () => {
    it('returns the seeded tables for the public schema', async () => {
      const res = await $fetch('/api/tables/overview', {
        method: 'POST',
        body: { ...cockroachdbBody(), schema: SCHEMA },
      });

      expect(Array.isArray(res)).toBe(true);
      const tableNames = res.map((t: any) =>
        (t.table_name || t.tableName || t.name || '').toLowerCase()
      );
      expect(tableNames).toContain('customers');
      expect(tableNames).toContain('orders');
    });
  });

  describe('POST /api/tables/structure', () => {
    it('returns column structure for the customers table', async () => {
      const res = await $fetch('/api/tables/structure', {
        method: 'POST',
        body: { ...cockroachdbBody(), schema: SCHEMA, tableName: TABLE },
      });

      expect(Array.isArray(res)).toBe(true);
      const colNames = res.map((c: any) =>
        (c.column_name || c.columnName || c.name || '').toLowerCase()
      );
      expect(colNames).toContain('customer_id');
      expect(colNames).toContain('email');
    });
  });

  describe('POST /api/tables/indexes', () => {
    it('returns indexes for the customers table', async () => {
      const res = await $fetch('/api/tables/indexes', {
        method: 'POST',
        body: { ...cockroachdbBody(), schema: SCHEMA, table: TABLE },
      });

      expect(Array.isArray(res)).toBe(true);
      // customers has a PK index and a unique index on email
      expect(res.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('POST /api/tables/ddl', () => {
    it('returns DDL for the customers table', async () => {
      const res = await $fetch('/api/tables/ddl', {
        method: 'POST',
        body: { ...cockroachdbBody(), schemaName: SCHEMA, tableName: TABLE },
      });

      expect(res).toBeDefined();
      const ddl = typeof res === 'string' ? res : (res?.ddl ?? res?.sql ?? '');
      expect(ddl.toLowerCase()).toContain('create');
    });
  });

  describe('POST /api/tables/meta', () => {
    it('returns meta information for the customers table', async () => {
      const res = await $fetch('/api/tables/meta', {
        method: 'POST',
        body: { ...cockroachdbBody(), schema: SCHEMA, tableName: TABLE },
      });

      expect(res).toBeDefined();
    });
  });

  describe('POST /api/tables/size', () => {
    it('returns size information for the customers table', async () => {
      const res = await $fetch('/api/tables/size', {
        method: 'POST',
        body: { ...cockroachdbBody(), schema: SCHEMA, tableName: TABLE },
      });

      expect(res).toBeDefined();
    });
  });

  describe('POST /api/tables/triggers', () => {
    it('returns an empty array (CockroachDB has no trigger support)', async () => {
      const res = await $fetch('/api/tables/triggers', {
        method: 'POST',
        body: { ...cockroachdbBody(), schema: SCHEMA, table: TABLE },
      });

      expect(Array.isArray(res)).toBe(true);
      expect(res.length).toBe(0);
    });
  });

  describe('POST /api/tables/rls', () => {
    it('reports RLS as disabled with an empty policy list', async () => {
      const res = await $fetch('/api/tables/rls', {
        method: 'POST',
        body: { ...cockroachdbBody(), schema: SCHEMA, table: TABLE },
      });

      expect(res).toBeDefined();
      expect(Array.isArray(res.policies)).toBe(true);
      expect(res.policies.length).toBe(0);
    });
  });

  describe('POST /api/tables/rules', () => {
    it('returns an empty array (CockroachDB has no CREATE RULE support)', async () => {
      const res = await $fetch('/api/tables/rules', {
        method: 'POST',
        body: { ...cockroachdbBody(), schema: SCHEMA, table: TABLE },
      });

      expect(Array.isArray(res)).toBe(true);
      expect(res.length).toBe(0);
    });
  });
});
