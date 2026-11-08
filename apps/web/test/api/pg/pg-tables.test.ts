import { setup, $fetch } from '@nuxt/test-utils/e2e';
import { describe, it, expect } from 'vitest';
import { pgBody, pgStringBody } from '../support/pg-connection';

describe('Tables API — PostgreSQL', async () => {
  await setup();

  const SCHEMA = 'public';
  const TABLE = 'actor'; // Pagila standard table

  // ─── overview.post ────────────────────────────────────────────────────
  describe('POST /api/tables/overview', () => {
    it('returns a list of tables for the public schema', async () => {
      const res = await $fetch('/api/tables/overview', {
        method: 'POST',
        body: { ...pgBody(), schema: SCHEMA },
      });

      expect(Array.isArray(res)).toBe(true);
      expect(res.length).toBeGreaterThan(0);

      // At least one table should exist
      const tableNames = res.map((t: any) =>
        (t.table_name || t.tableName || t.name || '').toLowerCase()
      );
      expect(tableNames).toContain('actor');
    });
  });

  // ─── structure.post ───────────────────────────────────────────────────
  describe('POST /api/tables/structure', () => {
    it('returns column structure for the actor table', async () => {
      const res = await $fetch('/api/tables/structure', {
        method: 'POST',
        body: { ...pgBody(), schema: SCHEMA, tableName: TABLE },
      });

      expect(Array.isArray(res)).toBe(true);
      expect(res.length).toBeGreaterThan(0);

      // actor table has actor_id, first_name, last_name, last_update
      const colNames = res.map((c: any) =>
        (c.column_name || c.columnName || c.name || '').toLowerCase()
      );
      expect(colNames).toContain('actor_id');
      expect(colNames).toContain('first_name');
      expect(colNames).toContain('last_name');
    });
  });

  // ─── indexes.post ────────────────────────────────────────────────────
  describe('POST /api/tables/indexes', () => {
    it('returns indexes for the actor table', async () => {
      const res = await $fetch('/api/tables/indexes', {
        method: 'POST',
        body: { ...pgBody(), schema: SCHEMA, table: TABLE },
      });

      expect(Array.isArray(res)).toBe(true);
      // actor table should have at least a PK index
      expect(res.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── ddl.post ─────────────────────────────────────────────────────────
  describe('POST /api/tables/ddl', () => {
    it('returns DDL for the actor table', async () => {
      const res = await $fetch('/api/tables/ddl', {
        method: 'POST',
        body: { ...pgBody(), schemaName: SCHEMA, tableName: TABLE },
      });

      expect(res).toBeDefined();
      // DDL should be a string or object containing CREATE TABLE
      const ddl = typeof res === 'string' ? res : (res?.ddl ?? res?.sql ?? '');
      expect(ddl.toLowerCase()).toContain('create');
    });
  });

  // ─── meta.post ────────────────────────────────────────────────────────
  describe('POST /api/tables/meta', () => {
    it('returns meta information for the actor table', async () => {
      const res = await $fetch('/api/tables/meta', {
        method: 'POST',
        body: { ...pgStringBody(), schema: SCHEMA, tableName: TABLE },
      });

      expect(res).toBeDefined();
    });
  });

  // ─── triggers.post ───────────────────────────────────────────────────
  describe('POST /api/tables/triggers', () => {
    it('returns triggers for the actor table (may be empty)', async () => {
      const res = await $fetch('/api/tables/triggers', {
        method: 'POST',
        body: { ...pgBody(), schema: SCHEMA, table: TABLE },
      });

      expect(Array.isArray(res)).toBe(true);
      // actor table in pagila has a last_updated trigger
      // Either way, the array shape should be valid
    });
  });

  // ─── rls.post ─────────────────────────────────────────────────────────
  describe('POST /api/tables/rls', () => {
    it('returns RLS status and policies', async () => {
      const res = await $fetch('/api/tables/rls', {
        method: 'POST',
        body: { ...pgBody(), schema: SCHEMA, table: TABLE },
      });

      expect(res).toBeDefined();
      // Should have policies array and an enabled status
      expect(res).toHaveProperty('policies');
      expect(Array.isArray(res.policies)).toBe(true);
    });
  });

  // ─── rules.post ──────────────────────────────────────────────────────
  describe('POST /api/tables/rules', () => {
    it('returns rules for the actor table (may be empty)', async () => {
      const res = await $fetch('/api/tables/rules', {
        method: 'POST',
        body: { ...pgBody(), schema: SCHEMA, table: TABLE },
      });

      expect(Array.isArray(res)).toBe(true);
    });
  });

  // ─── size.post ────────────────────────────────────────────────────────
  describe('POST /api/tables/size', () => {
    it('returns size information for the actor table', async () => {
      const res = await $fetch('/api/tables/size', {
        method: 'POST',
        body: { ...pgBody(), schema: SCHEMA, tableName: TABLE },
      });

      expect(res).toBeDefined();
    });
  });
});
