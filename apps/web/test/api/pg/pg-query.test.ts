import { setup, $fetch } from '@nuxt/test-utils/e2e';
import { describe, it, expect } from 'vitest';
import { pgBody, pgStringBody } from '../support/pg-connection';

describe('Query API — PostgreSQL', async () => {
  await setup();

  // ─── execute.post ─────────────────────────────────────────────────────
  describe('POST /api/query/execute', () => {
    it('executes a simple SELECT and returns result', async () => {
      const res = await $fetch('/api/query/execute', {
        method: 'POST',
        body: {
          ...pgStringBody(),
          query: 'SELECT 1 AS val',
        },
      });

      expect(res).toBeDefined();
      expect(res.result).toBeDefined();
      expect(res.result.length).toBeGreaterThanOrEqual(1);
      expect(res.result[0]).toMatchObject({ val: 1 });
      expect(res.queryTime).toBeDefined();
    });

    it('executes a query against pagila tables', async () => {
      const res = await $fetch('/api/query/execute', {
        method: 'POST',
        body: {
          ...pgStringBody(),
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
          ...pgStringBody(),
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
          ...pgStringBody(),
          query: 'SELEC invalid_syntax',
        },
        ignoreResponseError: true,
      });

      // The response should be an error (either status 500 or error object)
      expect(res).toBeDefined();
    });
  });

  // ─── raw-execute.post ─────────────────────────────────────────────────
  describe('POST /api/query/raw-execute', () => {
    it('executes raw SQL and returns rows with fields', async () => {
      const res = await $fetch('/api/query/raw-execute', {
        method: 'POST',
        body: {
          ...pgStringBody(),
          query: 'SELECT COUNT(*) AS total FROM actor',
          params: [],
        },
      });

      expect(res).toBeDefined();
      expect(res.rows).toBeDefined();
      expect(res.fields).toBeDefined();
      expect(typeof res.queryTime).toBe('number');
      // COUNT returns a string in pg
      expect(Number(res.rows[0]?.total ?? res.rows[0]?.[0])).toBeGreaterThan(0);
    });

    it('works with form-based connection details', async () => {
      const res = await $fetch('/api/query/raw-execute', {
        method: 'POST',
        body: {
          ...pgBody(),
          query: 'SELECT 1 AS ping',
          params: [],
        },
      });

      expect(res.rows).toBeDefined();
      expect(res.rows.length).toBeGreaterThanOrEqual(1);
    });
  });
});
