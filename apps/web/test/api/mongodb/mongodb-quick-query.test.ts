import { $fetch, setup } from '@nuxt/test-utils/e2e';
import { describe, expect, it } from 'vitest';
import { mongoBody } from '../support/mongo-connection';

describe('MongoDB Quick Query E2E', async () => {
  await setup();

  describe('POST /api/mongodb/collections', () => {
    it('lists the seeded collections with their document counts and stats', async () => {
      const res = await $fetch<{
        collections: {
          name: string;
          documentCount: number;
          storageSize: number;
          indexCount: number;
        }[];
      }>('/api/mongodb/collections', {
        method: 'POST',
        body: mongoBody(),
      });

      expect(res.collections).toEqual([
        expect.objectContaining({ name: 'orders', documentCount: 2 }),
        expect.objectContaining({ name: 'users', documentCount: 3 }),
      ]);
      expect(res.collections[1].storageSize).toBeGreaterThan(0);
      expect(res.collections[1].indexCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('POST /api/mongodb/quick-query', () => {
    it('returns every seeded document for a collection by default', async () => {
      const res = await $fetch<{
        documents: Record<string, unknown>[];
        total: number;
      }>('/api/mongodb/quick-query', {
        method: 'POST',
        body: mongoBody({ collection: 'users' }),
      });

      expect(res.total).toBe(3);
      expect(res.documents).toHaveLength(3);
      expect(res.documents[0]._id).toEqual({
        $oid: expect.stringMatching(/^[0-9a-f]{24}$/),
      });
      expect(res.documents.map(document => document.name)).toEqual([
        'Alice',
        'Bob',
        'Carol',
      ]);
    });

    it('paginates with skip and limit', async () => {
      const res = await $fetch<{ documents: Record<string, unknown>[] }>(
        '/api/mongodb/quick-query',
        {
          method: 'POST',
          body: mongoBody({ collection: 'users', skip: 1, limit: 1 }),
        }
      );

      expect(res.documents).toHaveLength(1);
      expect(res.documents[0].name).toBe('Bob');
    });

    it('sorts by a given field', async () => {
      const res = await $fetch<{ documents: Record<string, unknown>[] }>(
        '/api/mongodb/quick-query',
        {
          method: 'POST',
          body: mongoBody({ collection: 'users', sort: { age: -1 } }),
        }
      );

      expect(res.documents.map(document => document.name)).toEqual([
        'Carol',
        'Alice',
        'Bob',
      ]);
    });

    it('filters with an equality match', async () => {
      const res = await $fetch<{ documents: Record<string, unknown>[] }>(
        '/api/mongodb/quick-query',
        {
          method: 'POST',
          body: mongoBody({ collection: 'users', filter: { active: false } }),
        }
      );

      expect(res.documents.map(document => document.name)).toEqual(['Carol']);
    });

    it('filters with the allowed $in operator', async () => {
      const res = await $fetch<{ documents: Record<string, unknown>[] }>(
        '/api/mongodb/quick-query',
        {
          method: 'POST',
          body: mongoBody({
            collection: 'users',
            filter: { name: { $in: ['Alice', 'Carol'] } },
            sort: { name: 1 },
          }),
        }
      );

      expect(res.documents.map(document => document.name)).toEqual([
        'Alice',
        'Carol',
      ]);
    });

    it('rejects a filter operator outside the allowlist', async () => {
      await expect(
        $fetch('/api/mongodb/quick-query', {
          method: 'POST',
          body: mongoBody({
            collection: 'users',
            filter: { $where: 'sleep(1)' },
          }),
        })
      ).rejects.toThrow();
    });
  });
});
