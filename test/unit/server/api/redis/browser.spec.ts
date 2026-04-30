import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EConnectionMethod } from '~/core/types/entities/connection.entity';
import browserHandler from '~/server/api/redis/browser/index.post';
import valueHandler from '~/server/api/redis/browser/value.patch';

const {
  readBodyMock,
  readValidatedBodyMock,
  listRedisKeysMock,
  listRedisDatabasesMock,
  getRedisKeyDetailMock,
  updateRedisKeyValueMock,
} = vi.hoisted(() => ({
  readBodyMock: vi.fn(),
  readValidatedBodyMock: vi.fn(),
  listRedisKeysMock: vi.fn(),
  listRedisDatabasesMock: vi.fn(),
  getRedisKeyDetailMock: vi.fn(),
  updateRedisKeyValueMock: vi.fn(),
}));

vi.hoisted(() => {
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler);
});

vi.mock('h3', async importOriginal => {
  const actual = await importOriginal<typeof import('h3')>();

  return {
    ...actual,
    readBody: readBodyMock,
    readValidatedBody: readValidatedBodyMock,
  };
});

vi.mock('~/server/infrastructure/nosql/redis/redis-browser.service', () => ({
  listRedisKeys: listRedisKeysMock,
  listRedisDatabases: listRedisDatabasesMock,
  getRedisKeyDetail: getRedisKeyDetailMock,
  updateRedisKeyValue: updateRedisKeyValueMock,
}));

describe('Redis browser routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('forwards browser payloads and resolves the selected key detail', async () => {
    readBodyMock.mockResolvedValue({
      method: EConnectionMethod.STRING,
      stringConnection: 'redis://127.0.0.1:6379/0',
      databaseIndex: 2,
      keyPattern: 'orders:*',
      cursor: '15',
      selectedKey: 'orders:1',
    });
    listRedisKeysMock.mockResolvedValue({
      cursor: '0',
      keys: [{ key: 'orders:1', type: 'string', ttl: -1 }],
    });
    listRedisDatabasesMock.mockResolvedValue([
      { index: 2, label: 'DB 2', keyCount: 1, expires: 0, avgTtl: null },
    ]);
    getRedisKeyDetailMock.mockResolvedValue({
      key: 'orders:1',
      type: 'string',
      ttl: -1,
      value: 'paid',
    });

    const result = await browserHandler({} as never);

    expect(result).toEqual({
      cursor: '0',
      keys: [{ key: 'orders:1', type: 'string', ttl: -1 }],
      databases: [
        { index: 2, label: 'DB 2', keyCount: 1, expires: 0, avgTtl: null },
      ],
      selectedKeyDetail: null,
    });
    expect(listRedisKeysMock).toHaveBeenCalledWith(
      expect.objectContaining({
        method: EConnectionMethod.STRING,
        url: 'redis://127.0.0.1:6379/0',
        databaseIndex: 2,
      }),
      {
        cursor: '15',
        keyPattern: 'orders:*',
      }
    );
    expect(listRedisDatabasesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        databaseIndex: 2,
      }),
      2
    );
  });

  it('forwards value updates to the Redis browser service', async () => {
    readValidatedBodyMock.mockResolvedValue({
      method: EConnectionMethod.STRING,
      stringConnection: 'redis://127.0.0.1:6379/0',
      databaseIndex: 1,
      key: 'orders:1',
      previewKind: 'text',
      value: 'paid',
    });
    updateRedisKeyValueMock.mockResolvedValue({ ok: true });

    const result = await valueHandler({} as never);

    expect(result).toEqual({ ok: true });
    expect(updateRedisKeyValueMock).toHaveBeenCalledWith(
      expect.objectContaining({
        method: EConnectionMethod.STRING,
        url: 'redis://127.0.0.1:6379/0',
        databaseIndex: 1,
      }),
      'orders:1',
      {
        previewKind: 'text',
        stringFormat: undefined,
        tableKind: undefined,
        ttlSeconds: undefined,
        value: 'paid',
      }
    );
  });

  it('forwards ttlSeconds when provided', async () => {
    readValidatedBodyMock.mockResolvedValue({
      method: EConnectionMethod.STRING,
      stringConnection: 'redis://127.0.0.1:6379/0',
      key: 'session:abc',
      previewKind: 'text',
      value: 'active',
      ttlSeconds: 300,
    });
    updateRedisKeyValueMock.mockResolvedValue({ ok: true });

    await valueHandler({} as never);

    expect(updateRedisKeyValueMock).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'redis://127.0.0.1:6379/0' }),
      'session:abc',
      expect.objectContaining({ ttlSeconds: 300 })
    );
  });

  it('rejects when key is missing', async () => {
    readValidatedBodyMock.mockRejectedValue(
      new Error('Validation error: key is required')
    );

    await expect(valueHandler({} as never)).rejects.toThrow(
      'Validation error: key is required'
    );
    expect(updateRedisKeyValueMock).not.toHaveBeenCalled();
  });
});
