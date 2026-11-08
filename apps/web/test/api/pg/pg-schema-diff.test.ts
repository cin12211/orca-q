import { setup, $fetch } from '@nuxt/test-utils/e2e';
import { describe, it, expect } from 'vitest';
import { pgStringBody } from '../support/pg-connection';

describe('Schema Diff API — PostgreSQL', async () => {
  await setup();

  // ─── index.post (compare same DB to itself) ──────────────────────────
  describe('POST /api/schema-diff', () => {
    it('returns no differences when comparing a database to itself', async () => {
      const connBase = pgStringBody();

      const res = await $fetch('/api/schema-diff', {
        method: 'POST',
        body: {
          source: {
            connectionString: connBase.dbConnectionString,
            type: 'postgres',
          },
          target: {
            connectionString: connBase.dbConnectionString,
            type: 'postgres',
          },
          safeMode: true,
        },
      });

      expect(res).toBeDefined();
      // When comparing same DB, there should be no diff (or diff should be empty)
      if (res.tables) {
        expect(res.tables.added?.length ?? 0).toBe(0);
        expect(res.tables.removed?.length ?? 0).toBe(0);
      }
      if (res.differences) {
        expect(res.differences.length).toBe(0);
      }
    });
  });
});
