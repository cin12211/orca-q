import { describe, expect, it } from 'vitest';
import {
  buildMongoDocumentSelector,
  listMongoCollections,
  listMongoDatabases,
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
  it('returns collection stats sorted by name, with properties derived from listCollections info', async () => {
    const fakeDatabase = {
      listCollections: () => ({
        toArray: async () => [
          { name: 'users', type: 'collection' },
          { name: 'archive', type: 'collection', options: { capped: true } },
          { name: 'active_users', type: 'view' },
        ],
      }),
      command: async ({ collStats }: { collStats: string }) => {
        if (collStats === 'active_users') {
          throw new Error('collStats is not supported on views');
        }

        return {
          count: collStats === 'users' ? 42 : 5,
          storageSize: 4096,
          size: 2048,
          avgObjSize: 100,
          nindexes: 2,
          totalIndexSize: 512,
        };
      },
    };

    const collections = await listMongoCollections(fakeDatabase as any);

    expect(collections).toEqual([
      {
        name: 'active_users',
        properties: ['View'],
        documentCount: 0,
        storageSize: 0,
        dataSize: 0,
        avgDocumentSize: 0,
        indexCount: 0,
        totalIndexSize: 0,
      },
      {
        name: 'archive',
        properties: ['Capped'],
        documentCount: 5,
        storageSize: 4096,
        dataSize: 2048,
        avgDocumentSize: 100,
        indexCount: 2,
        totalIndexSize: 512,
      },
      {
        name: 'users',
        properties: [],
        documentCount: 42,
        storageSize: 4096,
        dataSize: 2048,
        avgDocumentSize: 100,
        indexCount: 2,
        totalIndexSize: 512,
      },
    ]);
  });

  it('returns an empty array when the database has no collections', async () => {
    const fakeDatabase = {
      listCollections: () => ({ toArray: async () => [] }),
      command: async () => ({}),
    };

    expect(await listMongoCollections(fakeDatabase as any)).toEqual([]);
  });
});

describe('listMongoDatabases', () => {
  it('returns database names sorted alphabetically', async () => {
    const fakeClient = {
      db: () => ({
        admin: () => ({
          listDatabases: async () => ({
            databases: [{ name: 'orcaq_fixture' }, { name: 'admin' }],
          }),
        }),
      }),
    };

    expect(await listMongoDatabases(fakeClient as any)).toEqual([
      'admin',
      'orcaq_fixture',
    ]);
  });
});
