import { setup, $fetch } from '@nuxt/test-utils/e2e';
import { describe, it, expect } from 'vitest';
import { myBody, myStringBody } from '../support/mysql-connection';

describe('Tables API — MySQL', async () => {
  await setup();

  // MySQL uses the database name as schema
  const SCHEMA = 'sakila';
  const TABLE = 'actor';

  // ─── overview.post ────────────────────────────────────────────────────
  describe('POST /api/tables/overview', () => {
    it('returns a list of tables for the sakila schema', async () => {
      const res = await $fetch('/api/tables/overview', {
        method: 'POST',
        body: { ...myBody(), schema: SCHEMA },
      });

      expect(Array.isArray(res)).toBe(true);
      expect(res.length).toBeGreaterThan(0);

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
        body: { ...myBody(), schema: SCHEMA, tableName: TABLE },
      });

      expect(Array.isArray(res)).toBe(true);
      expect(res.length).toBeGreaterThan(0);

      const colNames = res.map((c: any) =>
        (
          c.column_name ||
          c.COLUMN_NAME ||
          c.columnName ||
          c.name ||
          ''
        ).toLowerCase()
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
        body: { ...myBody(), schema: SCHEMA, table: TABLE },
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
        body: { ...myBody(), schemaName: SCHEMA, tableName: TABLE },
      });

      expect(res).toBeDefined();
      const ddl = typeof res === 'string' ? res : (res?.ddl ?? res?.sql ?? '');
      expect(ddl.toLowerCase()).toContain('create');
    });
  });

  // ─── meta.post ────────────────────────────────────────────────────────
  describe('POST /api/tables/meta', () => {
    it('returns meta information for the actor table', async () => {
      const res = await $fetch('/api/tables/meta', {
        method: 'POST',
        body: { ...myStringBody(), schema: SCHEMA, tableName: TABLE },
      });

      expect(res).toBeDefined();
    });
  });

  // ─── triggers.post ───────────────────────────────────────────────────
  describe('POST /api/tables/triggers', () => {
    it('returns triggers for the actor table (may be empty)', async () => {
      const res = await $fetch('/api/tables/triggers', {
        method: 'POST',
        body: { ...myBody(), schema: SCHEMA, table: TABLE },
      });

      expect(Array.isArray(res)).toBe(true);
    });
  });

  // ─── rls.post (MySQL has no RLS — returns disabled) ───────────────────
  describe('POST /api/tables/rls', () => {
    it('returns RLS as disabled for MySQL', async () => {
      const res = await $fetch('/api/tables/rls', {
        method: 'POST',
        body: { ...myBody(), schema: SCHEMA, table: TABLE },
      });

      expect(res).toBeDefined();
      expect(res).toHaveProperty('policies');
      expect(Array.isArray(res.policies)).toBe(true);
      expect(res.policies.length).toBe(0);
    });
  });

  // ─── rules.post (MySQL has no rules — returns empty) ──────────────────
  describe('POST /api/tables/rules', () => {
    it('returns empty rules for MySQL', async () => {
      const res = await $fetch('/api/tables/rules', {
        method: 'POST',
        body: { ...myBody(), schema: SCHEMA, table: TABLE },
      });

      expect(Array.isArray(res)).toBe(true);
      expect(res.length).toBe(0);
    });
  });

  // ─── size.post ────────────────────────────────────────────────────────
  describe('POST /api/tables/size', () => {
    it('returns size information for the actor table', async () => {
      const res = await $fetch('/api/tables/size', {
        method: 'POST',
        body: { ...myBody(), schema: SCHEMA, tableName: TABLE },
      });

      expect(res).toBeDefined();
    });
  });
});
