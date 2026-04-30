import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EConnectionMethod } from '~/core/types/entities/connection.entity';
import {
  listRedisKeys,
  updateRedisKeyValue,
} from '~/server/infrastructure/nosql/redis/redis-browser.service';

const { clientMock, closeMock, createRedisRuntimeClientMock } = vi.hoisted(
  () => {
    const clientMock = {
      scan: vi.fn(),
      select: vi.fn(),
      type: vi.fn(),
      ttl: vi.fn(),
      get: vi.fn(),
      set: vi.fn(),
      strLen: vi.fn(),
      sendCommand: vi.fn(),
      expire: vi.fn(),
      persist: vi.fn(),
      del: vi.fn(),
      hSet: vi.fn(),
      rPush: vi.fn(),
      sAdd: vi.fn(),
      zAdd: vi.fn(),
    };

    const closeMock = vi.fn().mockResolvedValue(undefined);
    const createRedisRuntimeClientMock = vi.fn().mockResolvedValue({
      client: clientMock,
      close: closeMock,
    });

    return {
      clientMock,
      closeMock,
      createRedisRuntimeClientMock,
    };
  }
);

vi.mock('~/server/infrastructure/nosql/redis/redis.client', () => ({
  createRedisRuntimeClient: createRedisRuntimeClientMock,
}));

describe('updateRedisKeyValue', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    clientMock.type.mockResolvedValue('string');
    clientMock.ttl.mockResolvedValue(120);
    clientMock.scan.mockResolvedValue({ cursor: 0, keys: [] });
    clientMock.select.mockResolvedValue('OK');
    clientMock.get.mockResolvedValue('paid');
    clientMock.set.mockResolvedValue('OK');
    clientMock.strLen.mockResolvedValue(4);
    clientMock.sendCommand.mockResolvedValue(null);
    clientMock.expire.mockResolvedValue(1);
    clientMock.persist.mockResolvedValue(1);
  });

  it('returns key memory usage in the Redis browser list response', async () => {
    clientMock.scan.mockResolvedValue({
      cursor: 0,
      keys: ['orders:1', 'orders:2'],
    });
    clientMock.type.mockImplementation(async (key: string) =>
      key === 'orders:1' ? 'string' : 'hash'
    );
    clientMock.ttl.mockImplementation(async (key: string) =>
      key === 'orders:1' ? 120 : -1
    );
    clientMock.sendCommand.mockImplementation(async (args: string[]) => {
      if (args[0] === 'MEMORY' && args[1] === 'USAGE') {
        return args[2] === 'orders:1' ? 1024 : 256;
      }

      return null;
    });

    const result = await listRedisKeys({
      method: EConnectionMethod.STRING,
      url: 'redis://127.0.0.1:6379/0',
    });

    expect(result).toEqual({
      cursor: '0',
      keys: [
        {
          key: 'orders:1',
          type: 'string',
          ttl: 120,
          memoryUsage: 1024,
          memoryUsageHuman: '1.0 KB',
        },
        {
          key: 'orders:2',
          type: 'hash',
          ttl: -1,
          memoryUsage: 256,
          memoryUsageHuman: '256 B',
        },
      ],
    });
    expect(closeMock).toHaveBeenCalled();
  });

  it('preserves the current TTL when saving a string without an explicit TTL change', async () => {
    await updateRedisKeyValue(
      {
        method: EConnectionMethod.STRING,
        url: 'redis://127.0.0.1:6379/0',
      },
      'orders:1',
      {
        previewKind: 'text',
        value: 'paid',
      }
    );

    expect(clientMock.set).toHaveBeenCalledWith('orders:1', 'paid');
    expect(clientMock.expire).toHaveBeenCalledWith('orders:1', 120);
    expect(clientMock.persist).not.toHaveBeenCalled();
    expect(closeMock).toHaveBeenCalled();
  });

  it('persists the key when the editor clears the TTL explicitly', async () => {
    await updateRedisKeyValue(
      {
        method: EConnectionMethod.STRING,
        url: 'redis://127.0.0.1:6379/0',
      },
      'orders:1',
      {
        previewKind: 'text',
        value: 'paid',
        ttlSeconds: null,
      }
    );

    expect(clientMock.persist).toHaveBeenCalledWith('orders:1');
  });
});
