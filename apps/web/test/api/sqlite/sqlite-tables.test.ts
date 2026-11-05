import { setup, $fetch } from '@nuxt/test-utils/e2e';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createSqliteFixture,
  destroySqliteFixture,
  sqliteBody,
  sqliteStringBody,
} from '../support/sqlite-connection';

let dbPath: string;

describe('Tables API — SQLite', async () => {
  await setup();

  // SQLite uses 'main' as the default schema (adapter also accepts 'public')
  const SCHEMA = 'main';
  const TABLE = 'actor';

  beforeAll(async () => {
    dbPath = await createSqliteFixture();
  });

  afterAll(async () => {
    await destroySqliteFixture();
  });

  // ─── overview.post ────────────────────────────────────────────────────
  describe('POST /api/tables/overview', () => {
    it('returns a list of tables for the main schema', async () => {
      const res = await $fetch('/api/tables/overview', {
        method: 'POST',
        body: { ...sqliteBody(dbPath), schema: SCHEMA },
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
        body: { ...sqliteBody(dbPath), schema: SCHEMA, tableName: TABLE },
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
        body: { ...sqliteBody(dbPath), schema: SCHEMA, table: TABLE },
      });

      expect(Array.isArray(res)).toBe(true);
      // actor has idx_actor_last_name at minimum
      expect(res.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── ddl.post ─────────────────────────────────────────────────────────
  describe('POST /api/tables/ddl', () => {
    it('returns DDL for the actor table', async () => {
      const res = await $fetch('/api/tables/ddl', {
        method: 'POST',
        body: { ...sqliteBody(dbPath), schemaName: SCHEMA, tableName: TABLE },
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
        body: { ...sqliteStringBody(dbPath), schema: SCHEMA, tableName: TABLE },
      });

      expect(res).toBeDefined();
    });
  });

  // ─── triggers.post ───────────────────────────────────────────────────
  describe('POST /api/tables/triggers', () => {
    it('returns triggers for the actor table', async () => {
      const res = await $fetch('/api/tables/triggers', {
        method: 'POST',
        body: { ...sqliteBody(dbPath), schema: SCHEMA, table: TABLE },
      });

      expect(Array.isArray(res)).toBe(true);
      // Sakila schema defines triggers on actor
      expect(res.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── rls.post (SQLite has no RLS — returns disabled) ──────────────────
  describe('POST /api/tables/rls', () => {
    it('returns RLS as disabled for SQLite', async () => {
      const res = await $fetch('/api/tables/rls', {
        method: 'POST',
        body: { ...sqliteBody(dbPath), schema: SCHEMA, table: TABLE },
      });

      expect(res).toBeDefined();
      expect(res).toHaveProperty('policies');
      expect(Array.isArray(res.policies)).toBe(true);
      expect(res.policies.length).toBe(0);
    });
  });

  // ─── rules.post (SQLite has no rules — returns empty) ─────────────────
  describe('POST /api/tables/rules', () => {
    it('returns empty rules for SQLite', async () => {
      const res = await $fetch('/api/tables/rules', {
        method: 'POST',
        body: { ...sqliteBody(dbPath), schema: SCHEMA, table: TABLE },
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
        body: { ...sqliteBody(dbPath), schema: SCHEMA, tableName: TABLE },
      });

      expect(res).toBeDefined();
    });
  });
});
