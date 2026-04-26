import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import {
  buildLogicalBackup,
  parseLogicalBackup,
  restoreLogicalBackup,
} from '~/server/infrastructure/database/backup/logical-backup';

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

  it('builds a logical backup payload for supported database types', async () => {
    createTableAdapterMock.mockResolvedValue({
      getOverviewTables: vi.fn().mockResolvedValue([
        {
          name: 'users',
          schema: 'app_db',
          kind: 'TABLE',
          owner: 'app_db',
          estimated_row: 1,
          total_size: '0 B',
          data_size: '0 B',
          index_size: '0 B',
          comment: null,
        },
      ]),
      getTableStructure: vi.fn().mockResolvedValue([
        {
          column_name: 'id',
          data_type: 'integer',
          is_nullable: 'NO',
          default_value: null,
          foreign_keys: '',
          column_comment: '',
        },
      ]),
      getTableDdl: vi
        .fn()
        .mockResolvedValue('CREATE TABLE app_db.users (id integer);'),
      exportTableData: vi.fn().mockResolvedValue([{ id: 1, name: 'Ada' }]),
    });

    const result = await buildLogicalBackup({
      dbConnectionString: '',
      database: 'app_db',
      type: DatabaseClientType.MYSQL,
      options: {
        format: 'plain',
        scope: 'full',
      },
    });

    expect(result.fileName).toContain('.heraq-db.json');
    expect(result.backup.kind).toBe('heraq-logical-backup');
    expect(result.backup.dbType).toBe(DatabaseClientType.MYSQL);
    expect(result.backup.tables).toHaveLength(1);
    expect(result.backup.tables[0]).toMatchObject({
      schema: 'app_db',
      name: 'users',
      rowCount: 1,
      rows: [{ id: 1, name: 'Ada' }],
    });
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

  it('rejects mismatched backup database families on restore', async () => {
    await expect(
      restoreLogicalBackup({
        dbConnectionString: 'postgres://example',
        type: DatabaseClientType.POSTGRES,
        options: {},
        content: JSON.stringify({
          version: 1,
          kind: 'heraq-logical-backup',
          exportedAt: '2026-04-25T00:00:00.000Z',
          dbType: DatabaseClientType.MYSQL,
          databaseName: 'inventory',
          scope: 'full',
          tables: [],
        }),
      })
    ).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('creates missing tables, cleans existing data, and inserts restored rows', async () => {
    createTableAdapterMock.mockResolvedValue({
      getOverviewTables: vi.fn().mockResolvedValue([]),
    });

    const result = await restoreLogicalBackup({
      dbConnectionString: 'postgres://example',
      type: DatabaseClientType.POSTGRES,
      options: {
        clean: true,
        exitOnError: true,
      },
      content: JSON.stringify({
        version: 1,
        kind: 'heraq-logical-backup',
        exportedAt: '2026-04-25T00:00:00.000Z',
        dbType: DatabaseClientType.POSTGRES,
        databaseName: 'app_db',
        scope: 'full',
        tables: [
          {
            schema: 'public',
            name: 'users',
            kind: 'TABLE',
            owner: 'public',
            comment: null,
            dependencies: [],
            rowCount: 1,
            ddl: 'CREATE TABLE public.users (id integer);',
            rows: [{ id: 1, name: 'Ada' }],
          },
        ],
      }),
    });

    expect(rawMock).toHaveBeenCalledWith(
      'CREATE TABLE public.users (id integer);'
    );
    expect(withSchemaMock).toHaveBeenCalledWith('public');
    expect(tableMock).toHaveBeenCalledWith('users');
    expect(delMock).toHaveBeenCalledTimes(1);
    expect(insertMock).toHaveBeenCalledWith([{ id: 1, name: 'Ada' }]);
    expect(result.success).toBe(true);
  });
});
