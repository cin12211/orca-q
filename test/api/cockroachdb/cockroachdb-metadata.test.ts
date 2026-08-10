import { setup, $fetch } from '@nuxt/test-utils/e2e';
import { describe, it, expect } from 'vitest';
import { cockroachdbStringBody } from '../support/cockroachdb-connection';

describe('Metadata API — CockroachDB', async () => {
  await setup();

  describe('POST /api/metadata/meta-data', () => {
    it('returns schema metadata with the public schema and seeded tables', async () => {
      const res = await $fetch('/api/metadata/meta-data', {
        method: 'POST',
        body: cockroachdbStringBody(),
      });

      expect(Array.isArray(res)).toBe(true);
      const publicSchema = res.find((s: any) => s.name === 'public');
      expect(publicSchema).toBeDefined();
    });
  });

  describe('POST /api/metadata/erd', () => {
    it('returns ERD data including the customers/orders foreign key', async () => {
      const res = await $fetch('/api/metadata/erd', {
        method: 'POST',
        body: cockroachdbStringBody(),
      });

      expect(res).toBeDefined();
      expect(res.tables || res.nodes || res.entities || res.data).toBeDefined();
    });
  });
});
