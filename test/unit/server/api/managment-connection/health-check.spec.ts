import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import {
  EConnectionFamily,
  EConnectionMethod,
  EConnectionProviderKind,
  EManagedSqliteProvider,
} from '~/core/types/entities/connection.entity';
import healthCheckHandler from '~/server/api/managment-connection/health-check';

const { readBodyMock, healthCheckConnectionMock } = vi.hoisted(() => ({
  readBodyMock: vi.fn(),
  healthCheckConnectionMock: vi.fn(),
}));

vi.hoisted(() => {
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler);
  vi.stubGlobal('readBody', readBodyMock);
});

vi.mock('~/server/infrastructure/driver/db-connection', () => ({
  healthCheckConnection: healthCheckConnectionMock,
}));

describe('management connection health-check route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('forwards managed SQLite payloads to the runtime health-check', async () => {
    readBodyMock.mockResolvedValue({
      type: DatabaseClientType.SQLITE3,
      method: EConnectionMethod.MANAGED,
      providerKind: EConnectionProviderKind.CLOUDFLARE_D1,
      family: EConnectionFamily.SQL,
      managedSqlite: {
        provider: EManagedSqliteProvider.CLOUDFLARE_D1,
        accountId: 'account-id',
        databaseId: 'database-id',
        apiToken: 'secret-token',
      },
    });
    healthCheckConnectionMock.mockResolvedValue({
      isConnectedSuccess: true,
    });

    const result = await healthCheckHandler({} as never);

    expect(result).toEqual({ isConnectedSuccess: true });
    expect(healthCheckConnectionMock).toHaveBeenCalledWith({
      url: '',
      method: EConnectionMethod.MANAGED,
      host: undefined,
      port: undefined,
      username: undefined,
      password: undefined,
      database: undefined,
      serviceName: undefined,
      filePath: undefined,
      type: DatabaseClientType.SQLITE3,
      providerKind: EConnectionProviderKind.CLOUDFLARE_D1,
      family: EConnectionFamily.SQL,
      managedSqlite: {
        provider: EManagedSqliteProvider.CLOUDFLARE_D1,
        accountId: 'account-id',
        databaseId: 'database-id',
        apiToken: 'secret-token',
      },
      ssl: undefined,
      ssh: undefined,
    });
  });

  it('forwards Redis payloads without falling back to SQL defaults', async () => {
    readBodyMock.mockResolvedValue({
      type: DatabaseClientType.REDIS,
      method: EConnectionMethod.STRING,
      providerKind: EConnectionProviderKind.REDIS_DIRECT,
      family: EConnectionFamily.REDIS,
      stringConnection: 'redis://localhost:6379/0',
    });
    healthCheckConnectionMock.mockResolvedValue({
      isConnectedSuccess: false,
      message: 'denied',
    });

    const result = await healthCheckHandler({} as never);

    expect(result).toEqual({
      isConnectedSuccess: false,
      message: 'denied',
    });
    expect(healthCheckConnectionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'redis://localhost:6379/0',
        type: DatabaseClientType.REDIS,
        providerKind: EConnectionProviderKind.REDIS_DIRECT,
        family: EConnectionFamily.REDIS,
      })
    );
  });
});
