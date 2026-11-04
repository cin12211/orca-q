import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { parseLogicalBackup } from '~/server/infrastructure/database/backup/logical-backup';

const {
  createTableAdapterMock,
  getDatabaseSourceMock,
  rawMock,
  withSchemaMock,
  tableMock,
  delMock,
  insertMock,
} = vi.hoisted(() => {
  const rawMock = vi.fn();
  const delMock = vi.fn();
  const insertMock = vi.fn();
  const tableMock = vi.fn(() => ({
    del: delMock,
    insert: insertMock,
  }));
  const withSchemaMock = vi.fn(() => ({
    table: tableMock,
  }));

  return {
    createTableAdapterMock: vi.fn(),
    getDatabaseSourceMock: vi.fn(() => ({
      knex: {
        raw: rawMock,
        withSchema: withSchemaMock,
      },
    })),
    rawMock,
    withSchemaMock,
    tableMock,
    delMock,
    insertMock,
  };
});

vi.mock('~/server/infrastructure/database/adapters/tables', () => ({
  createTableAdapter: createTableAdapterMock,
}));

vi.mock('~/server/infrastructure/driver/db-connection', () => ({
  getDatabaseSource: getDatabaseSourceMock,
}));

describe('logical-backup helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rawMock.mockResolvedValue(undefined);
    delMock.mockResolvedValue(undefined);
    insertMock.mockResolvedValue(undefined);
  });

  it('parses valid logical backup payloads', () => {
    const parsed = parseLogicalBackup(
      JSON.stringify({
        version: 1,
        kind: 'heraq-logical-backup',
        exportedAt: '2026-04-25T00:00:00.000Z',
        dbType: DatabaseClientType.POSTGRES,
        databaseName: 'app_db',
        scope: 'full',
        tables: [],
      })
    );

    expect(parsed.databaseName).toBe('app_db');
    expect(parsed.dbType).toBe(DatabaseClientType.POSTGRES);
  });
});
