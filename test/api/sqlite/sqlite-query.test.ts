import { setup, $fetch } from '@nuxt/test-utils/e2e';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createSqliteFixture,
  destroySqliteFixture,
  sqliteBody,
  sqliteStringBody,
} from '../support/sqlite-connection';

let dbPath: string;

describe('Query API — SQLite', async () => {
  await setup();

  beforeAll(async () => {
    dbPath = await createSqliteFixture();
  });

  afterAll(async () => {
    await destroySqliteFixture();
  });

  // ─── execute.post ─────────────────────────────────────────────────────
  describe('POST /api/query/execute', () => {
    it('executes a simple SELECT and returns result', async () => {
      const res = await $fetch('/api/query/execute', {
        method: 'POST',
        body: {
          ...sqliteStringBody(dbPath),
          query: 'SELECT 1 AS val',
        },
      });

      expect(res).toBeDefined();
      expect(res.result).toBeDefined();
      expect(res.result.length).toBeGreaterThanOrEqual(1);
      expect(res.result[0]).toMatchObject({ val: 1 });
      expect(res.queryTime).toBeDefined();
    });

    it('executes a query against sakila tables', async () => {
      const res = await $fetch('/api/query/execute', {
        method: 'POST',
        body: {
          ...sqliteStringBody(dbPath),
          query: 'SELECT actor_id, first_name, last_name FROM actor LIMIT 5',
        },
      });

      expect(res.result).toBeDefined();
      expect(res.result.length).toBeLessThanOrEqual(5);
      expect(res.result[0]).toHaveProperty('actor_id');
      expect(res.result[0]).toHaveProperty('first_name');
      expect(res.result[0]).toHaveProperty('last_name');
    });

    it('returns queryTime alongside result', async () => {
      const res = await $fetch('/api/query/execute', {
        method: 'POST',
        body: {
          ...sqliteStringBody(dbPath),
          query: 'SELECT actor_id, first_name FROM actor LIMIT 1',
        },
      });

      expect(res.result).toBeDefined();
      expect(typeof res.queryTime).toBe('number');
    });

    it('throws on invalid SQL', async () => {
      const res = await $fetch('/api/query/execute', {
        method: 'POST',
        body: {
          ...sqliteStringBody(dbPath),
          query: 'SELEC invalid_syntax',
        },
        ignoreResponseError: true,
      });

      expect(res).toBeDefined();
    });
  });

  // ─── raw-execute.post ─────────────────────────────────────────────────
  describe('POST /api/query/raw-execute', () => {
    it('executes raw SQL and returns rows with fields', async () => {
      const res = await $fetch('/api/query/raw-execute', {
        method: 'POST',
        body: {
          ...sqliteBody(dbPath),
          query: 'SELECT COUNT(*) AS total FROM actor',
          params: [],
        },
      });

      expect(res).toBeDefined();
      expect(res.rows).toBeDefined();
      expect(res.fields).toBeDefined();
      expect(typeof res.queryTime).toBe('number');
      expect(Number(res.rows[0]?.total ?? res.rows[0]?.[0])).toBeGreaterThan(0);
    });

    it('works with dbConnectionString', async () => {
      const res = await $fetch('/api/query/raw-execute', {
        method: 'POST',
        body: {
          ...sqliteStringBody(dbPath),
          query: 'SELECT 1 AS ping',
          params: [],
        },
      });

      expect(res.rows).toBeDefined();
      expect(res.rows.length).toBeGreaterThanOrEqual(1);
    });
  });
});
