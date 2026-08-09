import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EConnectionMethod } from '~/core/types/entities/connection.entity';
import {
  getRedisKeyDetail,
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

vi.mock(
  '~/server/infrastructure/nosql/redis/redis.client',
  async importOriginal => {
    const actual =
      await importOriginal<
        typeof import('~/server/infrastructure/nosql/redis/redis.client')
      >();

    return {
      ...actual,
      createRedisRuntimeClient: createRedisRuntimeClientMock,
    };
  }
);

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

  it('continues scanning until it collects the full key list for the browser response', async () => {
    clientMock.scan
      .mockResolvedValueOnce({
        cursor: 12,
        keys: ['orders:1'],
      })
      .mockResolvedValueOnce({
        cursor: 0,
        keys: ['feature:enabled'],
      });
    clientMock.type.mockImplementation(async (key: string) =>
      key === 'orders:1' ? 'string' : 'set'
    );
    clientMock.ttl.mockResolvedValue(-1);
    clientMock.sendCommand.mockImplementation(async (args: string[]) => {
      if (args[0] === 'MEMORY' && args[1] === 'USAGE') {
        return args[2] === 'orders:1' ? 1024 : 512;
      }

      return null;
    });

    const result = await listRedisKeys(
      {
        method: EConnectionMethod.STRING,
        url: 'redis://127.0.0.1:6379/0',
      },
      {
        count: 150,
      }
    );

    expect(clientMock.scan).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      cursor: '0',
      keys: [
        {
          key: 'orders:1',
          type: 'string',
          ttl: -1,
          memoryUsage: 1024,
          memoryUsageHuman: '1.0 KB',
        },
        {
          key: 'feature:enabled',
          type: 'set',
          ttl: -1,
          memoryUsage: 512,
          memoryUsageHuman: '512 B',
        },
      ],
    });
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

describe('getRedisKeyDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clientMock.select.mockResolvedValue('OK');
    clientMock.type.mockResolvedValue('string');
    clientMock.ttl.mockResolvedValue(120);
    clientMock.get.mockResolvedValue('paid');
    clientMock.strLen.mockResolvedValue(4);
    clientMock.sendCommand.mockResolvedValue(null);
  });

  it('resolves ttl, value, memory usage and encoding concurrently instead of sequentially', async () => {
    const callOrder: string[] = [];
    let ttlResolve!: () => void;
    let getResolve!: () => void;

    clientMock.ttl.mockImplementation(
      () =>
        new Promise(resolve => {
          callOrder.push('ttl:start');
          ttlResolve = () => {
            callOrder.push('ttl:end');
            resolve(120);
          };
        })
    );
    clientMock.get.mockImplementation(
      () =>
        new Promise(resolve => {
          callOrder.push('get:start');
          getResolve = () => {
            callOrder.push('get:end');
            resolve('paid');
          };
        })
    );

    const detailPromise = getRedisKeyDetail(
      { method: EConnectionMethod.STRING, url: 'redis://127.0.0.1:6379/0' },
      'orders:1'
    );

    await vi.waitFor(() => {
      expect(callOrder).toContain('ttl:start');
      expect(callOrder).toContain('get:start');
    });

    ttlResolve();
    getResolve();

    await detailPromise;

    expect(callOrder.indexOf('get:start')).toBeLessThan(
      callOrder.indexOf('ttl:end')
    );
  });
});
