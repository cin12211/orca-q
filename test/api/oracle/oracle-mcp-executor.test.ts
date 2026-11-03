import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { createDatabaseAdapter } from '~/server/infrastructure/driver';
import type { IDatabaseAdapter } from '~/server/infrastructure/driver';
import {
  executeReadOnlyQuery,
  executeWriteQuery,
} from '~/server/infrastructure/mcp/query-executor';
import { oracleStringBody } from '../support/oracle-connection';

/**
 * Requires the Oracle fixture:
 *   bash scripts/test-services/start-fixtures.sh --profile oracle
 */
describe('MCP query executor — Oracle', () => {
  let adapter: IDatabaseAdapter;

  beforeAll(() => {
    adapter = createDatabaseAdapter(
      DatabaseClientType.ORACLE,
      oracleStringBody().dbConnectionString
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

    expect(result.columns).toEqual(['FILM_ID', 'TITLE']);
    expect(result.rows).toHaveLength(5);
    expect(result.truncated).toBe(true);
    expect(result.rows[0]).toMatchObject({ FILM_ID: 1 });
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

  it('blocks writes at the database level even if the SQL guard is bypassed', async () => {
    await expect(
      executeReadOnlyQuery(
        adapter,
        "UPDATE language SET name = 'Hacked' WHERE language_id = 1",
        10
      )
    ).rejects.toThrow(/ORA-01456|read.only/i);

    const check = await executeReadOnlyQuery(
      adapter,
      'SELECT RTRIM(name) AS NAME FROM language WHERE language_id = 1',
      10
    );

    expect(check.rows).toEqual([{ NAME: 'English' }]);
  });

  it('leaves the pooled connection usable and unrestricted afterwards', async () => {
    await executeReadOnlyQuery(
      adapter,
      'SELECT * FROM film FETCH FIRST 1 ROWS ONLY',
      1
    );

    const result = await executeWriteQuery(
      adapter,
      'SELECT COUNT(*) AS total FROM film',
      10
    );

    expect(Number(result.rows[0].TOTAL)).toBeGreaterThan(1);
  });
});
