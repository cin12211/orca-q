import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EConnectionMethod } from '~/core/types/entities/connection.entity';
import workbenchHandler from '~/server/api/redis/workbench/execute.post';

const { readBodyMock, createRedisRuntimeClientMock } = vi.hoisted(() => ({
  readBodyMock: vi.fn(),
  createRedisRuntimeClientMock: vi.fn(),
}));

vi.hoisted(() => {
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler);
});

vi.mock('h3', async importOriginal => {
  const actual = await importOriginal<typeof import('h3')>();

  return {
    ...actual,
    readBody: readBodyMock,
  };
});

vi.mock('~/server/infrastructure/nosql/redis/redis.client', () => ({
  createRedisRuntimeClient: createRedisRuntimeClientMock,
}));

describe('Redis workbench route', () => {
  const runtime = {
    client: {
      select: vi.fn(),
      sendCommand: vi.fn(),
    },
    close: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    createRedisRuntimeClientMock.mockResolvedValue(runtime);
  });

  it('parses quoted Redis commands and selects the requested database', async () => {
    readBodyMock.mockResolvedValue({
      method: EConnectionMethod.STRING,
      stringConnection: 'redis://127.0.0.1:6379/0',
      databaseIndex: 3,
      command: `SET "orders:1" '{"status":"paid"}'`,
    });
    runtime.client.sendCommand.mockResolvedValue('OK');

    const result = await workbenchHandler({} as never);

    expect(createRedisRuntimeClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        method: EConnectionMethod.STRING,
        url: 'redis://127.0.0.1:6379/0',
        database: '3',
      })
    );
    expect(runtime.client.select).toHaveBeenCalledWith(3);
    expect(runtime.client.sendCommand).toHaveBeenCalledWith([
      'SET',
      'orders:1',
      '{"status":"paid"}',
    ]);
    expect(result).toEqual({
      command: ['SET', 'orders:1', '{"status":"paid"}'],
      result: 'OK',
    });
  });

  it('rejects empty Redis commands', async () => {
    readBodyMock.mockResolvedValue({
      method: EConnectionMethod.STRING,
      stringConnection: 'redis://127.0.0.1:6379/0',
      command: '   ',
    });

    await expect(workbenchHandler({} as never)).rejects.toThrow(
      'Redis command cannot be empty.'
    );
  });
});
