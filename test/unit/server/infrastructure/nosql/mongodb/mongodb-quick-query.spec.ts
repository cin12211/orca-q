import { describe, expect, it } from 'vitest';
import {
  buildMongoDocumentSelector,
  listMongoCollections,
  normalizeMongoFilter,
} from '~/server/infrastructure/nosql/mongodb/mongodb-quick-query';

describe('MongoDB Quick Query request helpers', () => {
  it('converts a valid _id string in a filter into an ObjectId', () => {
    const filter = normalizeMongoFilter({
      _id: '507f1f77bcf86cd799439011',
      status: 'active',
    });

    expect(filter.status).toBe('active');
    expect(filter._id?.toHexString()).toBe('507f1f77bcf86cd799439011');
  });

  it('rejects Mongo operators outside the Quick Query allowlist', () => {
    expect(() => normalizeMongoFilter({ $where: 'sleep(1)' })).toThrow(
      'Unsupported MongoDB filter operator: $where'
    );
  });

  it('creates a mutation selector only from a valid document id', () => {
    expect(
      buildMongoDocumentSelector('507f1f77bcf86cd799439011')._id.toHexString()
    ).toBe('507f1f77bcf86cd799439011');
    expect(() => buildMongoDocumentSelector('not-an-object-id')).toThrow(
      'Invalid MongoDB document _id'
    );
  });
});

describe('listMongoCollections', () => {
  it('returns each collection name with its document count, sorted by name', async () => {
    const fakeDatabase = {
      listCollections: () => ({
        toArray: async () => [{ name: 'users' }, { name: 'orders' }],
      }),
      collection: (name: string) => ({
        countDocuments: async () => (name === 'users' ? 42 : 7),
      }),
    };

    const collections = await listMongoCollections(fakeDatabase as any);

    expect(collections).toEqual([
      { name: 'orders', documentCount: 7 },
      { name: 'users', documentCount: 42 },
    ]);
  });

  it('returns an empty array when the database has no collections', async () => {
    const fakeDatabase = {
      listCollections: () => ({ toArray: async () => [] }),
      collection: () => ({ countDocuments: async () => 0 }),
    };

    expect(await listMongoCollections(fakeDatabase as any)).toEqual([]);
  });
});
