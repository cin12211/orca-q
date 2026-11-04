import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { createDatabaseAdapter } from '~/server/infrastructure/driver';
import type { IDatabaseAdapter } from '~/server/infrastructure/driver';
import { executeReadOnlyQuery } from '~/server/infrastructure/mcp/query-executor';

const tempDir = mkdtempSync(path.join(tmpdir(), 'orcaq-mcp-exec-'));
const dbPath = path.join(tempDir, 'data.sqlite');
let adapter: IDatabaseAdapter;

describe('executeReadOnlyQuery (sqlite)', () => {
  beforeAll(async () => {
    const { default: sqlite3 } = await import('sqlite3');
    await new Promise<void>((resolve, reject) => {
      const db = new sqlite3.Database(dbPath);
      db.exec(
        'CREATE TABLE t (id INTEGER); INSERT INTO t VALUES (1), (2);',
        error => db.close(() => (error ? reject(error) : resolve()))
      );
    });
    adapter = createDatabaseAdapter(DatabaseClientType.SQLITE3, {
      filename: dbPath,
    });
  });

  afterAll(async () => {
    await adapter.destroy();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('blocks writes at the database level even if the SQL guard is bypassed', async () => {
    await expect(
      executeReadOnlyQuery(adapter, 'DELETE FROM t', 10)
    ).rejects.toThrow(/readonly|read-only|query_only/i);

    const result = await executeReadOnlyQuery(
      adapter,
      'SELECT COUNT(*) AS total FROM t',
      10
    );
    expect(result.rows).toEqual([{ total: 2 }]);
  });
});
