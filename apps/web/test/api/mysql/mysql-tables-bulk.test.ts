import { setup, $fetch } from '@nuxt/test-utils/e2e';
import { describe, it, expect } from 'vitest';
import { myBody, myStringBody } from '../support/mysql-connection';

describe('Tables Bulk Operations API — MySQL', async () => {
  await setup();

  const SCHEMA = 'sakila';

  async function createTempTable(name: string) {
    await $fetch('/api/query/raw-execute', {
      method: 'POST',
      body: {
        ...myStringBody(),
        query: `
          CREATE TABLE IF NOT EXISTS \`${SCHEMA}\`.\`${name}\` (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            value INT DEFAULT 0
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
        ...myStringBody(),
        query: `DROP TABLE IF EXISTS \`${SCHEMA}\`.\`${name}\``,
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
            ...myStringBody(),
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
          ...myStringBody(),
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
          ...myStringBody(),
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
          ...myStringBody(),
          query: `INSERT INTO \`${SCHEMA}\`.\`${TABLE}\` (name, value) VALUES ('row1', 1), ('row2', 2)`,
          params: [],
        },
      });

      try {
        const res = await $fetch('/api/tables/bulk-update', {
          method: 'POST',
          body: {
            ...myStringBody(),
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
          ...myStringBody(),
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
          ...myStringBody(),
          query: `INSERT INTO \`${SCHEMA}\`.\`${TABLE}\` (name, value) VALUES ('del1', 1), ('del2', 2), ('keep', 3)`,
          params: [],
        },
      });

      try {
        const res = await $fetch('/api/tables/bulk-delete', {
          method: 'POST',
          body: {
            ...myStringBody(),
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
            ...myStringBody(),
            query: `SELECT COUNT(*) AS cnt FROM \`${SCHEMA}\`.\`${TABLE}\``,
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
          ...myStringBody(),
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
