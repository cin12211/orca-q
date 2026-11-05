import { setup, $fetch } from '@nuxt/test-utils/e2e';
import { describe, it, expect } from 'vitest';
import { myBody, myStringBody } from '../support/mysql-connection';

describe('Metadata API — MySQL', async () => {
  await setup();

  // ─── meta-data.post ───────────────────────────────────────────────────
  describe('POST /api/metadata/meta-data', () => {
    it('returns schema metadata with tables and views', async () => {
      const res = await $fetch('/api/metadata/meta-data', {
        method: 'POST',
        body: myStringBody(),
      });

      expect(Array.isArray(res)).toBe(true);
      expect(res.length).toBeGreaterThan(0);

      // Sakila should appear as a schema
      const sakilaSchema = res.find(
        (s: any) => (s.name || '').toLowerCase() === 'sakila'
      );
      expect(sakilaSchema).toBeDefined();
    });

    it('includes table listings inside schemas', async () => {
      const res = await $fetch('/api/metadata/meta-data', {
        method: 'POST',
        body: myStringBody(),
      });

      const sakilaSchema = res.find(
        (s: any) => (s.name || '').toLowerCase() === 'sakila'
      );

      const tables = sakilaSchema?.tables ?? [];
      expect(tables.length).toBeGreaterThan(0);
    });

    it('works with form-based connection', async () => {
      const res = await $fetch('/api/metadata/meta-data', {
        method: 'POST',
        body: myBody(),
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
        body: myStringBody(),
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
        body: myStringBody(),
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
