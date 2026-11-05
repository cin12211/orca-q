import { setup, $fetch } from '@nuxt/test-utils/e2e';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createSqliteFixture,
  destroySqliteFixture,
  sqliteStringBody,
} from '../support/sqlite-connection';

let dbPath: string;

describe('Schema Diff API — SQLite', async () => {
  await setup();

  beforeAll(async () => {
    dbPath = await createSqliteFixture();
  });

  afterAll(async () => {
    await destroySqliteFixture();
  });

  // ─── index.post (compare same DB to itself) ──────────────────────────
  describe('POST /api/schema-diff', () => {
    it('returns no differences when comparing a database to itself', async () => {
      const conn = sqliteStringBody(dbPath);

      const res = await $fetch('/api/schema-diff', {
        method: 'POST',
        body: {
          source: {
            connectionString: conn.dbConnectionString,
            type: 'sqlite3',
          },
          target: {
            connectionString: conn.dbConnectionString,
            type: 'sqlite3',
          },
          safeMode: true,
        },
      });

      expect(res).toBeDefined();
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
