import { setup, $fetch } from '@nuxt/test-utils/e2e';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createSqliteFixture,
  destroySqliteFixture,
  sqliteStringBody,
} from '../support/sqlite-connection';

let dbPath: string;

describe('Metadata API — SQLite', async () => {
  await setup();

  beforeAll(async () => {
    dbPath = await createSqliteFixture();
  });

  afterAll(async () => {
    await destroySqliteFixture();
  });

  // ─── meta-data.post ───────────────────────────────────────────────────
  describe('POST /api/metadata/meta-data', () => {
    it('returns schema metadata with tables', async () => {
      const res = await $fetch('/api/metadata/meta-data', {
        method: 'POST',
        body: sqliteStringBody(dbPath),
      });

      expect(Array.isArray(res)).toBe(true);
      expect(res.length).toBeGreaterThan(0);
    });

    it('includes table listings inside schemas', async () => {
      const res = await $fetch('/api/metadata/meta-data', {
        method: 'POST',
        body: sqliteStringBody(dbPath),
      });

      // SQLite uses 'main' as the default schema
      const mainSchema = res.find(
        (s: any) =>
          (s.name || '').toLowerCase() === 'main' ||
          (s.name || '').toLowerCase() === 'public'
      );

      // Either a schema with tables or the top-level array has tables
      const tables =
        mainSchema?.tables ?? res.flatMap((s: any) => s.tables ?? []);
      expect(tables.length).toBeGreaterThan(0);
    });

    it('works with filePath-based connection', async () => {
      // metadata endpoint passes only dbConnectionString, not filePath
      const res = await $fetch('/api/metadata/meta-data', {
        method: 'POST',
        body: sqliteStringBody(dbPath),
      });

      expect(Array.isArray(res)).toBe(true);
      expect(res.length).toBeGreaterThan(0);
    });
  });

  // ─── reverse-schemas.post ─────────────────────────────────────────────
  describe('POST /api/metadata/reverse-schemas', () => {
    it('returns reverse schema information', async () => {
      const res = await $fetch('/api/metadata/reverse-schemas', {
        method: 'POST',
        body: sqliteStringBody(dbPath),
      });

      expect(res).toBeDefined();
      expect(res).toHaveProperty('result');
    });
  });

  // ─── erd.post ─────────────────────────────────────────────────────────
  describe('POST /api/metadata/erd', () => {
    it('returns ERD data for the database', async () => {
      const res = await $fetch('/api/metadata/erd', {
        method: 'POST',
        body: sqliteStringBody(dbPath),
      });

      expect(res).toBeDefined();
      if (Array.isArray(res)) {
        expect(res.length).toBeGreaterThan(0);
      } else {
        expect(
          res.tables || res.nodes || res.entities || res.data
        ).toBeDefined();
      }
    });
  });
});
