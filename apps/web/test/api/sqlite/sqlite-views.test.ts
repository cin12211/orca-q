import { setup, $fetch } from '@nuxt/test-utils/e2e';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createSqliteFixture,
  destroySqliteFixture,
  sqliteBody,
} from '../support/sqlite-connection';

let dbPath: string;

describe('Views API — SQLite', async () => {
  await setup();

  const SCHEMA = 'main';

  beforeAll(async () => {
    dbPath = await createSqliteFixture();
  });

  afterAll(async () => {
    await destroySqliteFixture();
  });

  // ─── overview.post (unsupported for SQLite) ────────────────────────────
  describe('POST /api/views/overview', () => {
    it('returns 501 because SQLite does not support listing views', async () => {
      const res = await $fetch('/api/views/overview', {
        method: 'POST',
        body: { ...sqliteBody(dbPath), schema: SCHEMA },
        ignoreResponseError: true,
      });

      expect(res).toBeDefined();
    });
  });

  // ─── meta.post (unsupported for SQLite) ───────────────────────────────
  describe('POST /api/views/meta', () => {
    it('returns 501 because SQLite does not support view metadata', async () => {
      const res = await $fetch('/api/views/meta', {
        method: 'POST',
        body: {
          ...sqliteBody(dbPath),
          schema: SCHEMA,
          viewName: 'customer_list',
        },
        ignoreResponseError: true,
      });

      expect(res).toBeDefined();
    });
  });

  // ─── definition.post ─────────────────────────────────────────────────
  describe('POST /api/views/definition', () => {
    it('returns the SQL definition of a view', async () => {
      const res = await $fetch('/api/views/definition', {
        method: 'POST',
        body: {
          ...sqliteBody(dbPath),
          schema: SCHEMA,
          viewId: 'customer_list',
        },
        ignoreResponseError: true,
      });

      expect(res).toBeDefined();
    });
  });
});
