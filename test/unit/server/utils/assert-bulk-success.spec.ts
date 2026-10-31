import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SqliteTableAdapter } from '~/server/infrastructure/database/adapters/tables/sqlite/sqlite-table.adapter';
import { SqliteAdapter } from '~/server/infrastructure/driver/sqlite.adapter';
import { assertBulkSuccess } from '~/server/utils/assert-bulk-success';

describe('assertBulkSuccess', () => {
  it('passes successful results through', () => {
    const result = { success: true, queryTime: 1 };

    expect(assertBulkSuccess(result)).toBe(result);
  });

  it('turns a refused save into an HTTP error', () => {
    expect(() =>
      assertBulkSuccess({
        success: false,
        error: 'no such table',
        queryTime: 1,
      })
    ).toThrowError(
      expect.objectContaining({ statusCode: 422, message: 'no such table' })
    );
  });

  it('catches the failure SQLite reports for a broken statement', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'orcaq-bulk-'));
    const filename = join(directory, 'empty.sqlite');
    writeFileSync(filename, '');
    const driver = new SqliteAdapter({ filename });

    try {
      const tables = new (SqliteTableAdapter as unknown as new (
        driver: SqliteAdapter
      ) => SqliteTableAdapter)(driver);

      const result = await tables.executeBulkUpdate([
        'UPDATE missing_table SET a = 1',
      ]);

      expect(result.success).toBe(false);
      expect(() => assertBulkSuccess(result)).toThrow('missing_table');
    } finally {
      await driver.destroy();
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
