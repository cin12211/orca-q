import { describe, expect, it, vi } from 'vitest';
import { SqliteTableAdapter } from '~/server/infrastructure/database/adapters/tables/sqlite/sqlite-table.adapter';

describe('SqliteTableAdapter', () => {
  it('maps the legacy public schema name to main for overview queries', async () => {
    const rawQueryMock = vi.fn().mockResolvedValue([]);
    const adapter = new (SqliteTableAdapter as any)({
      rawQuery: rawQueryMock,
    });

    await adapter.getOverviewTables('public');

    expect(rawQueryMock).toHaveBeenCalledWith(
      expect.stringContaining('FROM "main".sqlite_master')
    );
    expect(rawQueryMock).not.toHaveBeenCalledWith(
      expect.stringContaining('FROM "public".sqlite_master')
    );
  });
});
