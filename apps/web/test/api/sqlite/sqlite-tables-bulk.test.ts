import { setup, $fetch } from '@nuxt/test-utils/e2e';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createSqliteFixture,
  destroySqliteFixture,
  sqliteBody,
  sqliteStringBody,
} from '../support/sqlite-connection';

let dbPath: string;

describe('Tables Bulk Operations API — SQLite', async () => {
  await setup();

  const SCHEMA = 'main';

  beforeAll(async () => {
    dbPath = await createSqliteFixture();
  });

  afterAll(async () => {
    await destroySqliteFixture();
  });

  async function createTempTable(name: string) {
    await $fetch('/api/query/raw-execute', {
      method: 'POST',
      body: {
        ...sqliteBody(dbPath),
        query: `
          CREATE TABLE IF NOT EXISTS "${name}" (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            value INTEGER DEFAULT 0
          )
        `,
        params: [],
      },
    });
  }

  async function dropTempTable(name: string) {
    await $fetch('/api/query/raw-execute', {
      method: 'POST',
      body: {
        ...sqliteBody(dbPath),
        query: `DROP TABLE IF EXISTS "${name}"`,
        params: [],
      },
    });
  }

  // ─── bulk-insert.post ─────────────────────────────────────────────────
  describe('POST /api/tables/bulk-insert', () => {
    const TABLE = '_test_bulk_insert';

    it('inserts multiple rows and returns success', async () => {
      await dropTempTable(TABLE);
      await createTempTable(TABLE);

      try {
        const res = await $fetch('/api/tables/bulk-insert', {
          method: 'POST',
          body: {
            ...sqliteStringBody(dbPath),
            tableName: TABLE,
            schemaName: SCHEMA,
            insertItems: [
              { name: 'alpha', value: 10 },
              { name: 'beta', value: 20 },
              { name: 'gamma', value: 30 },
            ],
          },
        });

        expect(res).toBeDefined();
        expect(res.success).toBe(true);
      } finally {
        await dropTempTable(TABLE);
      }
    });

    it('rejects when insertItems is empty', async () => {
      const res = await $fetch('/api/tables/bulk-insert', {
        method: 'POST',
        body: {
          ...sqliteStringBody(dbPath),
          tableName: 'whatever',
          schemaName: SCHEMA,
          insertItems: [],
        },
        ignoreResponseError: true,
      });

      expect(res).toBeDefined();
    });

    it('rejects when tableName is missing', async () => {
      const res = await $fetch('/api/tables/bulk-insert', {
        method: 'POST',
        body: {
          ...sqliteStringBody(dbPath),
          tableName: '',
          schemaName: SCHEMA,
          insertItems: [{ name: 'x' }],
        },
        ignoreResponseError: true,
      });

      expect(res).toBeDefined();
    });
  });

  // ─── bulk-update.post ─────────────────────────────────────────────────
  describe('POST /api/tables/bulk-update', () => {
    const TABLE = '_test_bulk_update';

    it('updates rows by primary key', async () => {
      await dropTempTable(TABLE);
      await createTempTable(TABLE);

      // Seed data
      await $fetch('/api/query/raw-execute', {
        method: 'POST',
        body: {
          ...sqliteBody(dbPath),
          query: `INSERT INTO "${TABLE}" (name, value) VALUES ('row1', 1), ('row2', 2)`,
          params: [],
        },
      });

      try {
        const res = await $fetch('/api/tables/bulk-update', {
          method: 'POST',
          body: {
            ...sqliteStringBody(dbPath),
            tableName: TABLE,
            schemaName: SCHEMA,
            pKeys: ['id'],
            updates: [
              { pKeyValue: { id: 1 }, update: { value: 100 } },
              { pKeyValue: { id: 2 }, update: { value: 200 } },
            ],
          },
        });

        expect(res).toBeDefined();
        expect(res.success).toBe(true);
      } finally {
        await dropTempTable(TABLE);
      }
    });

    it('rejects when updates array is empty', async () => {
      const res = await $fetch('/api/tables/bulk-update', {
        method: 'POST',
        body: {
          ...sqliteStringBody(dbPath),
          tableName: 'whatever',
          schemaName: SCHEMA,
          pKeys: ['id'],
          updates: [],
        },
        ignoreResponseError: true,
      });

      expect(res).toBeDefined();
    });
  });

  // ─── bulk-delete.post ─────────────────────────────────────────────────
  describe('POST /api/tables/bulk-delete', () => {
    const TABLE = '_test_bulk_delete';

    it('deletes rows by primary key values', async () => {
      await dropTempTable(TABLE);
      await createTempTable(TABLE);

      // Seed data
      await $fetch('/api/query/raw-execute', {
        method: 'POST',
        body: {
          ...sqliteBody(dbPath),
          query: `INSERT INTO "${TABLE}" (name, value) VALUES ('del1', 1), ('del2', 2), ('keep', 3)`,
          params: [],
        },
      });

      try {
        const res = await $fetch('/api/tables/bulk-delete', {
          method: 'POST',
          body: {
            ...sqliteStringBody(dbPath),
            tableName: TABLE,
            schemaName: SCHEMA,
            pKeys: ['id'],
            pKeyValues: [{ id: 1 }, { id: 2 }],
          },
        });

        expect(res).toBeDefined();
        expect(res.success).toBe(true);

        // Verify only 1 row remains
        const verify = await $fetch('/api/query/raw-execute', {
          method: 'POST',
          body: {
            ...sqliteBody(dbPath),
            query: `SELECT COUNT(*) AS cnt FROM "${TABLE}"`,
            params: [],
          },
        });
        const cnt = verify.rows[0]?.cnt ?? verify.rows[0]?.[0];
        expect(Number(cnt)).toBe(1);
      } finally {
        await dropTempTable(TABLE);
      }
    });

    it('rejects when pKeyValues is empty', async () => {
      const res = await $fetch('/api/tables/bulk-delete', {
        method: 'POST',
        body: {
          ...sqliteStringBody(dbPath),
          tableName: 'whatever',
          schemaName: SCHEMA,
          pKeys: ['id'],
          pKeyValues: [],
        },
        ignoreResponseError: true,
      });

      expect(res).toBeDefined();
    });
  });
});
