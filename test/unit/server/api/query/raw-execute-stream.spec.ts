import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import {
  EConnectionProviderKind,
  EManagedSqliteProvider,
} from '~/core/types/entities/connection.entity';
import rawExecuteStreamHandler from '~/server/api/query/raw-execute-stream.post';

const { readBodyMock, createQueryAdapterMock, rawExecuteStreamMock } =
  vi.hoisted(() => ({
    readBodyMock: vi.fn(),
    createQueryAdapterMock: vi.fn(),
    rawExecuteStreamMock: vi.fn(),
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

vi.mock('~/server/infrastructure/database/adapters/query', () => ({
  createQueryAdapter: createQueryAdapterMock,
}));

describe('raw execute stream route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createQueryAdapterMock.mockResolvedValue({
      rawExecuteStream: rawExecuteStreamMock,
    });
  });

  it('accepts managed SQLite payloads without host or connection string', async () => {
    readBodyMock.mockResolvedValue({
      query: 'select * from sqlite_master',
      type: DatabaseClientType.SQLITE3,
      providerKind: EConnectionProviderKind.TURSO,
      managedSqlite: {
        provider: EManagedSqliteProvider.TURSO,
        url: 'libsql://demo.turso.io',
        authToken: 'token',
      },
      params: { limit: 10 },
    });

    await rawExecuteStreamHandler({} as never);

    expect(createQueryAdapterMock).toHaveBeenCalledWith(
      DatabaseClientType.SQLITE3,
      expect.objectContaining({
        providerKind: EConnectionProviderKind.TURSO,
        managedSqlite: {
          provider: EManagedSqliteProvider.TURSO,
          url: 'libsql://demo.turso.io',
          authToken: 'token',
        },
      })
    );
    expect(rawExecuteStreamMock).toHaveBeenCalledWith(
      expect.anything(),
      'select * from sqlite_master',
      { limit: 10 }
    );
  });

  it('accepts Cloudflare D1 payloads without host or connection string', async () => {
    readBodyMock.mockResolvedValue({
      query: 'select name from sqlite_master where type = ?',
      type: DatabaseClientType.SQLITE3,
      providerKind: EConnectionProviderKind.CLOUDFLARE_D1,
      managedSqlite: {
        provider: EManagedSqliteProvider.CLOUDFLARE_D1,
        accountId: 'account-id',
        databaseId: 'database-id',
        apiToken: 'token',
      },
      params: { type: 'table' },
    });

    await rawExecuteStreamHandler({} as never);

    expect(createQueryAdapterMock).toHaveBeenCalledWith(
      DatabaseClientType.SQLITE3,
      expect.objectContaining({
        providerKind: EConnectionProviderKind.CLOUDFLARE_D1,
        managedSqlite: {
          provider: EManagedSqliteProvider.CLOUDFLARE_D1,
          accountId: 'account-id',
          databaseId: 'database-id',
          apiToken: 'token',
        },
      })
    );
    expect(rawExecuteStreamMock).toHaveBeenCalledWith(
      expect.anything(),
      'select name from sqlite_master where type = ?',
      { type: 'table' }
    );
  });
});
