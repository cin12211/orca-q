import { describe, expect, it, vi } from 'vitest';
import { createMongoCapabilityHost } from '~/server/infrastructure/nosql/mongodb/raw-query/mongo-capability-host';

describe('Mongo capability host', () => {
  it('opens and advances a bounded cursor', async () => {
    const close = vi.fn();
    const cursor = {
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      batchSize: vi.fn().mockReturnThis(),
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

    const opened = await host.execute({
      id: 'rpc-1',
      kind: 'cursor-open',
      descriptor: {
        source: {
          target: 'collection',
          collection: 'users',
          method: 'find',
          args: [{ active: true }],
        },
        modifiers: [{ method: 'limit', args: [5] }],
      },
    });

    expect(opened).toMatchObject({ ok: true, cursorId: expect.any(String) });
    await host.closeAll();
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
      host.execute({
        id: 'rpc-2',
        kind: 'collection-call',
        collection: 'users',
        method: 'updateMany',
        args: [{}, { $set: { active: true } }],
      })
    ).rejects.toThrow('Write operation is not approved');
  });

  it('rejects an unapproved aggregation write at runtime', async () => {
    const database = {
      collection: vi.fn().mockReturnValue({
        aggregate: vi.fn().mockReturnValue({ next: vi.fn(), close: vi.fn() }),
      }),
    };
    const host = createMongoCapabilityHost(database as any, {
      approvedOperations: [],
      maxDocuments: 10,
    });

    await expect(
      host.execute({
        id: 'rpc-3',
        kind: 'cursor-open',
        descriptor: {
          source: {
            target: 'collection',
            collection: 'users',
            method: 'aggregate',
            args: [[{ $out: 'archive' }]],
          },
          modifiers: [],
        },
      })
    ).rejects.toThrow('Write operation is not approved');
  });
});
