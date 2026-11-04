import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { createDatabaseAdapter } from '~/server/infrastructure/driver';
import type { IDatabaseAdapter } from '~/server/infrastructure/driver';
import {
  executeReadOnlyQuery,
  executeWriteQuery,
} from '~/server/infrastructure/mcp/query-executor';
import { crdbStringBody } from '../support/cockroachdb-connection';

/**
 * Requires the CockroachDB fixture:
 *   bash scripts/test-services/start-fixtures.sh --profile cockroachdb
 */
describe('MCP query executor — CockroachDB', () => {
  let adapter: IDatabaseAdapter;

  beforeAll(() => {
    adapter = createDatabaseAdapter(
      DatabaseClientType.COCKROACHDB,
      crdbStringBody().dbConnectionString
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
    expect(result.rows[0]).toMatchObject({ film_id: '1' });
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
    // CockroachDB enforces BEGIN READ ONLY, so the write is rejected outright.
    await executeReadOnlyQuery(
      adapter,
      "UPDATE language SET name = 'Hacked' WHERE language_id = 1",
      10
    ).catch(() => undefined);

    const check = await executeReadOnlyQuery(
      adapter,
      'SELECT name FROM language WHERE language_id = 1',
      10
    );

    expect(check.rows).toEqual([{ name: 'English' }]);
  });

  it('leaves the pooled connection usable and unrestricted afterwards', async () => {
    await executeReadOnlyQuery(adapter, 'SELECT * FROM film LIMIT 1', 1);

    const result = await executeWriteQuery(
      adapter,
      'SELECT COUNT(*) AS total FROM film',
      10
    );

    expect(Number(result.rows[0].total)).toBeGreaterThan(1);
  });
});
