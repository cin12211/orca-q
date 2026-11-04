import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EManagedSqliteProvider } from '~/core/types/entities/connection.entity';
import { D1Adapter } from '~/server/infrastructure/driver/managed-sqlite/d1.adapter';

const fetchMock = vi.fn();

vi.stubGlobal('fetch', fetchMock);

describe('D1Adapter', () => {
  let adapter: D1Adapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new D1Adapter({
      provider: EManagedSqliteProvider.CLOUDFLARE_D1,
      accountId: 'account-id',
      databaseId: 'database-id',
      apiToken: 'test-token',
    });
  });

  afterEach(async () => {
    await adapter.destroy();
  });

  it('sends Cloudflare D1 query requests and reports returned rows for selects', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        result: [
          {
            success: true,
            meta: {
              changes: 0,
            },
            results: [{ health_check: 1 }],
          },
        ],
      }),
    });

    const result = await adapter.rawOut('SELECT ? AS health_check', [1]);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.cloudflare.com/client/v4/accounts/account-id/d1/database/database-id/query',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
          sql: 'SELECT ? AS health_check',
          params: [1],
        }),
      }
    );
    expect(result.command).toBe('SELECT');
    expect(result.rowCount).toBe(1);
    expect(result.fields.map(field => field.name)).toEqual(['health_check']);
    expect(result.rows).toEqual([[1]]);
  });

  it('returns rowCount from meta.changes for mutation statements', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        result: [
          {
            success: true,
            meta: {
              changes: 3,
              last_row_id: 42,
            },
            results: [],
          },
        ],
      }),
    });

    const result = await adapter.rawOut('DELETE FROM users WHERE active = ?', [
      0,
    ]);

    expect(result.command).toBe('DELETE');
    expect(result.rowCount).toBe(3);
    expect(result.rows).toEqual([]);
    expect(result.fields).toEqual([]);
  });

  it('throws Cloudflare D1 API error messages for failed requests', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        success: false,
        errors: [{ message: 'Cloudflare D1 API token rejected.' }],
      }),
    });

    await expect(adapter.rawQuery('SELECT 1')).rejects.toThrow(
      'Cloudflare D1 API token rejected.'
    );
  });
});
