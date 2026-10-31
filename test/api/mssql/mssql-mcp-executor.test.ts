import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { createDatabaseAdapter } from '~/server/infrastructure/driver';
import type { IDatabaseAdapter } from '~/server/infrastructure/driver';
import {
  executeReadOnlyQuery,
  executeWriteQuery,
} from '~/server/infrastructure/mcp/query-executor';
import { mssqlStringBody } from '../support/mssql-connection';

/**
 * Requires the SQL Server fixture:
 *   bash scripts/test-services/start-fixtures.sh --profile mssql
 */
describe('MCP query executor — SQL Server', () => {
  let adapter: IDatabaseAdapter;

  beforeAll(() => {
    adapter = createDatabaseAdapter(
      DatabaseClientType.MSSQL,
      mssqlStringBody().dbConnectionString
    );
  });

  afterAll(async () => {
    await adapter.destroy();
  });

  it('reads rows, capped at the limit', async () => {
    const result = await executeReadOnlyQuery(
      adapter,
      'SELECT film_id, title FROM film ORDER BY film_id',
      5
    );

    expect(result.columns).toEqual(['film_id', 'title']);
    expect(result.rows).toHaveLength(5);
    expect(result.truncated).toBe(true);
    expect(result.rows[0]).toMatchObject({ film_id: 1 });
  });

  it('flags truncation when more rows exist than the limit', async () => {
    const result = await executeReadOnlyQuery(
      adapter,
      'SELECT film_id FROM film',
      3
    );

    expect(result.rows).toHaveLength(3);
    expect(result.truncated).toBe(true);
  });

  it('rolls back writes even if the SQL guard is bypassed', async () => {
    await executeReadOnlyQuery(
      adapter,
      "UPDATE language SET name = N'Hacked' WHERE language_id = 1",
      10
    );

    const check = await executeReadOnlyQuery(
      adapter,
      'SELECT RTRIM(name) AS name FROM language WHERE language_id = 1',
      10
    );

    expect(check.rows).toEqual([{ name: 'English' }]);
  });

  it('leaves the pooled connection usable and unrestricted afterwards', async () => {
    await executeReadOnlyQuery(adapter, 'SELECT TOP 1 * FROM film', 1);

    const result = await executeWriteQuery(
      adapter,
      'SELECT COUNT(*) AS total FROM film',
      10
    );

    expect(Number(result.rows[0].total)).toBeGreaterThan(1);
  });
});
