import { describe, expect, it, vi } from 'vitest';
import { createMongoCapabilityHost } from '~/server/infrastructure/nosql/mongodb/raw-query/mongo-capability-host';

describe('Mongo capability host', () => {
  it('creates a direct db facade for script execution', async () => {
    const findOne = vi.fn().mockResolvedValue({ name: 'Alice' });
    const database = {
      collection: vi.fn().mockReturnValue({ findOne }),
    };
    const host = createMongoCapabilityHost(database as any, {
      approvedOperations: [],
      maxDocuments: 10,
    });

    const db = host.createFacade();
    const result = await db.collection('users').findOne({ active: true });

    expect(result).toEqual({ name: 'Alice' });
    expect(findOne).toHaveBeenCalledWith({ active: true });
  });

  it('streams and closes a direct cursor facade', async () => {
    const close = vi.fn();
    const cursor = {
      limit: vi.fn().mockReturnThis(),
      next: vi
        .fn()
        .mockResolvedValueOnce({ name: 'Alice' })
        .mockResolvedValueOnce(null),
      close,
    };
    const database = {
      collection: vi
        .fn()
        .mockReturnValue({ find: vi.fn().mockReturnValue(cursor) }),
    };
    const host = createMongoCapabilityHost(database as any, {
      approvedOperations: [],
      maxDocuments: 10,
    });

    const db = host.createFacade();
    const result = db.collection('users').find({}).limit(5);
    const rows: Record<string, unknown>[] = [];
    const streamed = await host.streamCursor(result, batch =>
      rows.push(...batch)
    );

    expect(result).not.toHaveProperty('cursor');
    expect(streamed).toEqual({ rowCount: 1, truncated: false });
    expect(rows).toEqual([{ name: 'Alice' }]);
    expect(close).toHaveBeenCalledOnce();
  });

  it('rejects an unapproved write at runtime', async () => {
    const database = {
      collection: vi.fn().mockReturnValue({ updateMany: vi.fn() }),
    };
    const host = createMongoCapabilityHost(database as any, {
      approvedOperations: [],
      maxDocuments: 10,
    });

    await expect(
      host
        .createFacade()
        .collection('users')
        .updateMany({}, { $set: { active: true } })
    ).rejects.toThrow('Write operation is not approved');
  });

  it('rejects an unapproved aggregation write at runtime', () => {
    const database = {
      collection: vi.fn().mockReturnValue({ aggregate: vi.fn() }),
    };
    const host = createMongoCapabilityHost(database as any, {
      approvedOperations: [],
      maxDocuments: 10,
    });

    expect(() =>
      host
        .createFacade()
        .collection('users')
        .aggregate([{ $out: 'archive' }])
    ).toThrow('Write operation is not approved');
  });

  it('requires approval before executing a database command', async () => {
    const database = { command: vi.fn() };
    const host = createMongoCapabilityHost(database as any, {
      approvedOperations: [],
      maxDocuments: 10,
    });

    await expect(
      host.createFacade().command({ dropDatabase: 1 })
    ).rejects.toThrow('Write operation is not approved');
    expect(database.command).not.toHaveBeenCalled();
  });

  it('switches databases through the script facade', async () => {
    const findOne = vi.fn().mockResolvedValue({ name: 'Alice' });
    const databases = {
      default: { collection: vi.fn() },
      analytics: {
        collection: vi.fn().mockReturnValue({ findOne }),
      },
    };
    const host = createMongoCapabilityHost(databases.default as any, {
      approvedOperations: [],
      maxDocuments: 10,
      databaseName: 'default',
      getDatabase: name => databases[name as 'default' | 'analytics'],
    });

    const result = await host
      .createFacade()
      .getSiblingDB('analytics')
      .collection('users')
      .findOne({ active: true });

    expect(result).toEqual({ name: 'Alice' });
    expect(findOne).toHaveBeenCalledWith({ active: true });
  });
});
