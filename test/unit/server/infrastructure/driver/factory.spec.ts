import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import {
  EConnectionProviderKind,
  EManagedSqliteProvider,
} from '~/core/types/entities/connection.entity';
import { createDatabaseAdapter } from '~/server/infrastructure/driver/factory';
import { SqliteAdapter } from '~/server/infrastructure/driver/sqlite.adapter';

const { createManagedSqliteAdapterMock } = vi.hoisted(() => ({
  createManagedSqliteAdapterMock: vi.fn(),
}));

vi.mock(
  '~/server/infrastructure/driver/managed-sqlite',
  async importOriginal => {
    const actual =
      await importOriginal<
        typeof import('~/server/infrastructure/driver/managed-sqlite')
      >();

    return {
      ...actual,
      createManagedSqliteAdapter: createManagedSqliteAdapterMock,
    };
  }
);

describe('createDatabaseAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the managed SQLite factory for Cloudflare D1 sessions', () => {
    const managedAdapter = { dbType: DatabaseClientType.SQLITE3 } as never;
    createManagedSqliteAdapterMock.mockReturnValue(managedAdapter);

    const adapter = createDatabaseAdapter(DatabaseClientType.SQLITE3, '', {
      providerKind: EConnectionProviderKind.CLOUDFLARE_D1,
      managedSqlite: {
        provider: EManagedSqliteProvider.CLOUDFLARE_D1,
        accountId: 'account-id',
        databaseId: 'database-id',
        apiToken: 'token',
      },
    });

    expect(adapter).toBe(managedAdapter);
    expect(createManagedSqliteAdapterMock).toHaveBeenCalledWith({
      providerKind: EConnectionProviderKind.CLOUDFLARE_D1,
      managedSqlite: {
        provider: EManagedSqliteProvider.CLOUDFLARE_D1,
        accountId: 'account-id',
        databaseId: 'database-id',
        apiToken: 'token',
      },
    });
  });

  it('keeps local SQLite sessions on the existing sqlite adapter', () => {
    const adapter = createDatabaseAdapter(
      DatabaseClientType.SQLITE3,
      ':memory:'
    );

    expect(adapter).toBeInstanceOf(SqliteAdapter);
    expect(createManagedSqliteAdapterMock).not.toHaveBeenCalled();
  });
});
