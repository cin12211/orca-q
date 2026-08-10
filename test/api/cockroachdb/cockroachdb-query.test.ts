import { setup, $fetch } from '@nuxt/test-utils/e2e';
import { describe, it, expect } from 'vitest';
import {
  cockroachdbBody,
  cockroachdbStringBody,
} from '../support/cockroachdb-connection';

describe('Query API — CockroachDB', async () => {
  await setup();

  describe('POST /api/query/execute', () => {
    it('executes a simple SELECT and returns result', async () => {
      const res = await $fetch('/api/query/execute', {
        method: 'POST',
        body: {
          ...cockroachdbStringBody(),
          query: 'SELECT 1 AS val',
        },
      });

      expect(res.result).toBeDefined();
      // CockroachDB defaults integer literals to INT8; node-postgres returns
      // int8/bigint (oid 20) as a string to avoid precision loss, so this is
      // "1" here rather than the number 1 Postgres would return.
      expect(Number(res.result[0]?.val)).toBe(1);
    });

    it('executes a query against the seeded customers table', async () => {
      const res = await $fetch('/api/query/execute', {
        method: 'POST',
        body: {
          ...cockroachdbStringBody(),
          query:
            'SELECT customer_id, first_name FROM customers ORDER BY customer_id LIMIT 5',
        },
      });

      expect(res.result.length).toBeGreaterThan(0);
      expect(res.result[0]).toHaveProperty('customer_id');
      expect(res.result[0]).toHaveProperty('first_name');
    });
  });

  describe('POST /api/query/raw-execute', () => {
    it('works with form-based connection details', async () => {
      const res = await $fetch('/api/query/raw-execute', {
        method: 'POST',
        body: {
          ...cockroachdbBody(),
          query: 'SELECT 1 AS ping',
          params: [],
        },
      });

      expect(res.rows).toBeDefined();
      expect(res.rows.length).toBeGreaterThanOrEqual(1);
    });
  });
});
