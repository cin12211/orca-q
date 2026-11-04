import { setup, $fetch } from '@nuxt/test-utils/e2e';
import { describe, it, expect } from 'vitest';
import { pgBody, pgStringBody } from '../support/pg-connection';

describe('Metadata API — PostgreSQL', async () => {
  await setup();

  // ─── meta-data.post ───────────────────────────────────────────────────
  describe('POST /api/metadata/meta-data', () => {
    it('returns schema metadata with tables and views', async () => {
      const res = await $fetch('/api/metadata/meta-data', {
        method: 'POST',
        body: pgStringBody(),
      });

      expect(Array.isArray(res)).toBe(true);
      expect(res.length).toBeGreaterThan(0);

      // Pagila should have a "public" schema
      const publicSchema = res.find((s: any) => s.name === 'public');
      expect(publicSchema).toBeDefined();
    });

    it('includes table listings inside schemas', async () => {
      const res = await $fetch('/api/metadata/meta-data', {
        method: 'POST',
        body: pgStringBody(),
      });

      const publicSchema = res.find((s: any) => s.name === 'public');

      // Should have tables array
      const tables = publicSchema?.tables ?? [];
      expect(tables.length).toBeGreaterThan(0);
    });

    it('works with form-based connection', async () => {
      const res = await $fetch('/api/metadata/meta-data', {
        method: 'POST',
        body: pgBody(),
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
        body: pgStringBody(),
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
        body: pgStringBody(),
      });

      expect(res).toBeDefined();
      // ERD data should have tables/nodes
      if (Array.isArray(res)) {
        expect(res.length).toBeGreaterThan(0);
      } else {
        // Could be an object with tables/relationships
        expect(
          res.tables || res.nodes || res.entities || res.data
        ).toBeDefined();
      }
    });
  });
});
