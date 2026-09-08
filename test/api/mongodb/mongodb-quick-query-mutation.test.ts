import { $fetch, setup } from '@nuxt/test-utils/e2e';
import { describe, expect, it } from 'vitest';
import { mongoBody } from '../support/mongo-connection';

function mutate<T>(body: Record<string, unknown>) {
  return $fetch<T>('/api/mongodb/quick-query-mutation', {
    method: 'POST',
    body: mongoBody(body),
  });
}

async function deleteById(collection: string, id: string) {
  await mutate({ collection, operation: 'delete', id });
}

describe('MongoDB Quick Query Mutation E2E', async () => {
  await setup();

  it('inserts a document and returns its id', async () => {
    const inserted = await mutate<{ id: string }>({
      collection: 'users',
      operation: 'insert',
      document: { name: 'Dave', email: 'dave@example.com', age: 40 },
    });

    expect(inserted.id).toMatch(/^[0-9a-f]{24}$/);

    await deleteById('users', inserted.id);
  });

  it('updates a document by id with $set semantics', async () => {
    const inserted = await mutate<{ id: string }>({
      collection: 'users',
      operation: 'insert',
      document: { name: 'Erin', age: 20 },
    });

    const updated = await mutate<{ document: Record<string, unknown> | null }>({
      collection: 'users',
      operation: 'update',
      id: inserted.id,
      document: { age: 21 },
    });

    expect(updated.document?.age).toBe(21);
    expect(updated.document?.name).toBe('Erin');

    await deleteById('users', inserted.id);
  });

  it('deletes a document by id', async () => {
    const inserted = await mutate<{ id: string }>({
      collection: 'users',
      operation: 'insert',
      document: { name: 'Frank', age: 50 },
    });

    const deleted = await mutate<{ deletedCount: number }>({
      collection: 'users',
      operation: 'delete',
      id: inserted.id,
    });

    expect(deleted.deletedCount).toBe(1);
  });

  it('rejects an update with a malformed document id', async () => {
    await expect(
      mutate({
        collection: 'users',
        operation: 'update',
        id: 'not-an-object-id',
        document: { age: 1 },
      })
    ).rejects.toThrow();
  });
});
