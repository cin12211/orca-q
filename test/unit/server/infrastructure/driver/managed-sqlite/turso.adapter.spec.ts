import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EManagedSqliteProvider } from '~/core/types/entities/connection.entity';
import { TursoAdapter } from '~/server/infrastructure/driver/managed-sqlite/turso.adapter';

const { createClientMock, executeMock, closeMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  executeMock: vi.fn(),
  closeMock: vi.fn(),
}));

vi.mock('@libsql/client/http', () => ({
  createClient: createClientMock,
}));

describe('TursoAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClientMock.mockReturnValue({
      execute: executeMock,
      close: closeMock,
    });
  });

  it('creates the Turso client through the HTTP entrypoint', () => {
    new TursoAdapter({
      provider: EManagedSqliteProvider.TURSO,
      url: 'libsql://demo.turso.io',
      authToken: 'secret-token',
      branchName: 'preview',
    });

    expect(createClientMock).toHaveBeenCalledWith({
      url: 'libsql://demo.turso.io?branch=preview',
      authToken: 'secret-token',
    });
  });

  it('runs health checks through the remote HTTP client', async () => {
    executeMock.mockResolvedValue({
      rows: [{ health_check: 1 }],
      columns: ['health_check'],
      rowsAffected: 1,
    });

    const adapter = new TursoAdapter({
      provider: EManagedSqliteProvider.TURSO,
      url: 'libsql://demo.turso.io',
      authToken: 'secret-token',
    });

    await expect(adapter.healthCheck()).resolves.toBe(true);
    expect(executeMock).toHaveBeenCalledWith({
      sql: 'SELECT 1 AS health_check',
      args: [],
    });
  });
});
