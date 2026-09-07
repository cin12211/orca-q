import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMongoDocumentMutation } from '~/components/modules/quick-query/mongodb/hooks/useMongoDocumentMutation';

const mockFetch = vi.fn();
vi.stubGlobal('$fetch', mockFetch);

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock('vue-sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

beforeEach(() => {
  mockFetch.mockReset();
  mockToastSuccess.mockReset();
  mockToastError.mockReset();
});

describe('useMongoDocumentMutation', () => {
  it('calls quick-query-mutation with operation update and updates document in-place', async () => {
    const documents = ref([
      { _id: 'doc-1', name: 'Alice', age: 25 },
      { _id: 'doc-2', name: 'Bob', age: 30 },
    ]);

    mockFetch.mockResolvedValueOnce({
      document: { _id: 'doc-1', name: 'Alice Smith', age: 26 },
    });

    const { isMutating, savingDocId, updateDocument } =
      useMongoDocumentMutation({
        connection: ref({ id: 'c1', type: 'mongodb' } as any),
        databaseName: ref('testdb'),
        collectionName: ref('users'),
        documents,
      });

    expect(isMutating.value).toBe(false);
    expect(savingDocId.value).toBeNull();

    const result = await updateDocument('doc-1', {
      name: 'Alice Smith',
      age: 26,
    });

    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/mongodb/quick-query-mutation',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({
          database: 'testdb',
          collection: 'users',
          operation: 'update',
          id: 'doc-1',
          document: { name: 'Alice Smith', age: 26 },
        }),
      })
    );
    expect(documents.value[0]).toEqual({
      _id: 'doc-1',
      name: 'Alice Smith',
      age: 26,
    });
    expect(mockToastSuccess).toHaveBeenCalledWith(
      'Document updated successfully!'
    );
    expect(isMutating.value).toBe(false);
    expect(savingDocId.value).toBeNull();
  });

  it('strips _id from update payload for immutable _id protection', async () => {
    const documents = ref([{ _id: 'doc-1', name: 'Alice' }]);
    mockFetch.mockResolvedValueOnce({
      document: { _id: 'doc-1', name: 'Alice Updated' },
    });

    const { updateDocument } = useMongoDocumentMutation({
      connection: ref({ id: 'c1', type: 'mongodb' } as any),
      databaseName: ref('testdb'),
      collectionName: ref('users'),
      documents,
    });

    const result = await updateDocument('doc-1', {
      _id: 'tampered-id',
      name: 'Alice Updated',
    });

    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/mongodb/quick-query-mutation',
      expect.objectContaining({
        body: expect.objectContaining({
          id: 'doc-1',
          document: { name: 'Alice Updated' },
        }),
      })
    );
  });

  it('handles error gracefully and does not modify documents', async () => {
    const documents = ref([{ _id: 'doc-1', name: 'Alice' }]);
    mockFetch.mockRejectedValueOnce(new Error('Network failure'));

    const { updateDocument } = useMongoDocumentMutation({
      connection: ref({ id: 'c1', type: 'mongodb' } as any),
      databaseName: ref('testdb'),
      collectionName: ref('users'),
      documents,
    });

    const result = await updateDocument('doc-1', { name: 'New Name' });

    expect(result).toBe(false);
    expect(documents.value[0]).toEqual({ _id: 'doc-1', name: 'Alice' });
    expect(mockToastError).toHaveBeenCalledWith('Network failure');
  });
});
