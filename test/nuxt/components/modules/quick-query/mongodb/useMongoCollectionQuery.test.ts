import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMongoCollectionQuery } from '~/components/modules/quick-query/mongodb/hooks/useMongoCollectionQuery';

const mockFetch = vi.fn();
vi.stubGlobal('$fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe('useMongoCollectionQuery', () => {
  it('fetches the first page of documents for the collection', async () => {
    mockFetch.mockResolvedValueOnce({
      documents: [{ _id: '1', name: 'Alice' }],
      total: 1,
      queryTime: 2.5,
    });

    const { documents, total, fetchDocuments } = useMongoCollectionQuery({
      connection: ref({ id: 'c1', database: 'shop' } as any),
      collectionName: ref('users'),
    });

    await fetchDocuments();

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/mongodb/quick-query',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({
          collection: 'users',
          skip: 0,
          limit: 100,
        }),
      })
    );
    expect(documents.value).toEqual([{ _id: '1', name: 'Alice' }]);
    expect(total.value).toBe(1);
  });

  it('advances skip by limit on next page and re-fetches', async () => {
    mockFetch.mockResolvedValue({ documents: [], total: 0, queryTime: 0 });

    const { skip, onNextPage } = useMongoCollectionQuery({
      connection: ref({ id: 'c1', database: 'shop' } as any),
      collectionName: ref('users'),
    });

    onNextPage();
    await Promise.resolve();

    expect(skip.value).toBe(100);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/mongodb/quick-query',
      expect.objectContaining({ body: expect.objectContaining({ skip: 100 }) })
    );
  });
});
