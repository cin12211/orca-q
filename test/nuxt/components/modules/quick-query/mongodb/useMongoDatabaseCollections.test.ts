import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMongoDatabaseCollections } from '~/components/modules/quick-query/mongodb/hooks/useMongoDatabaseCollections';

const mockFetch = vi.fn();
vi.stubGlobal('$fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe('useMongoDatabaseCollections', () => {
  it('fetches collections for the given connection and stores the result', async () => {
    mockFetch.mockResolvedValueOnce({
      collections: [{ name: 'users', documentCount: 3 }],
    });

    const connection = ref({ id: 'c1', database: 'shop' } as any);
    const { collections, isLoading, fetchCollections } =
      useMongoDatabaseCollections({ connection });

    await fetchCollections();

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/mongodb/collections',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({ database: 'shop' }),
      })
    );
    expect(collections.value).toEqual([{ name: 'users', documentCount: 3 }]);
    expect(isLoading.value).toBe(false);
  });

  it('records an error message when the request fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('connection refused'));

    const { error, fetchCollections } = useMongoDatabaseCollections({
      connection: ref({ id: 'c1', database: 'shop' } as any),
    });

    await fetchCollections();

    expect(error.value).toBe('connection refused');
  });
});
