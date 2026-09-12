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

  it('extracts descriptive error message from fetch error data when query fails', async () => {
    const fetchError = Object.assign(
      new Error('[POST] "/api/mongodb/quick-query": 400 Bad Request'),
      {
        data: {
          statusCode: 400,
          message: 'Invalid MongoDB document _id: "not-an-id"',
        },
      }
    );
    mockFetch.mockRejectedValueOnce(fetchError);

    const { error, fetchDocuments } = useMongoCollectionQuery({
      connection: ref({ id: 'c1', database: 'shop' } as any),
      collectionName: ref('users'),
    });

    await fetchDocuments();

    expect(error.value).toBe('Invalid MongoDB document _id: "not-an-id"');
  });

  it('applies more options, resets skip to 0, and sends options in request body', async () => {
    mockFetch.mockResolvedValue({ documents: [], total: 0, queryTime: 0 });

    const { activeMoreOptionsPayload, applyMoreOptions, skip } =
      useMongoCollectionQuery({
        connection: ref({ id: 'c1', database: 'shop' } as any),
        collectionName: ref('users'),
      });

    skip.value = 200;

    const moreOptions = {
      project: { name: 1, email: 1 },
      sort: { createdAt: -1 as const },
      collation: { locale: 'en' },
      hint: 'email_1',
      maxTimeMS: 5000,
    };

    await applyMoreOptions(moreOptions);

    expect(skip.value).toBe(0);
    expect(activeMoreOptionsPayload.value).toEqual(moreOptions);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/mongodb/quick-query',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({
          collection: 'users',
          skip: 0,
          limit: 100,
          project: { name: 1, email: 1 },
          sort: { createdAt: -1 },
          collation: { locale: 'en' },
          hint: 'email_1',
          maxTimeMS: 5000,
        }),
      })
    );
  });
});
