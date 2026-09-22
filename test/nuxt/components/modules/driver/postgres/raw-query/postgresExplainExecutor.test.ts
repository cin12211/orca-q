import { beforeEach, describe, expect, it, vi } from 'vitest';
import { postgresExplainExecutor } from '~/components/modules/driver/postgres/raw-query/services';

const mockFetch = vi.fn();
(global as any).$fetch = mockFetch;

describe('postgresExplainExecutor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs the prefixed statement through the non-streaming endpoint', async () => {
    mockFetch.mockResolvedValue({
      rows: [{ 'QUERY PLAN': [{ Plan: {} }] }],
      fields: [{ name: 'QUERY PLAN' }],
      queryTime: 12,
    });

    const handlers = {
      onMeta: vi.fn(),
      onRows: vi.fn(),
      onComplete: vi.fn(),
      onError: vi.fn(),
    };

    postgresExplainExecutor.execute(
      {
        connection: { connectionString: 'postgres://x' } as any,
        query: 'EXPLAIN (ANALYZE, FORMAT JSON) SELECT 1',
        params: {},
      },
      handlers
    );

    await vi.waitFor(() => expect(handlers.onComplete).toHaveBeenCalled());

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/query/raw-execute',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({
          query: 'EXPLAIN (ANALYZE, FORMAT JSON) SELECT 1',
        }),
      })
    );
    expect(handlers.onMeta).toHaveBeenCalledWith(
      [{ name: 'QUERY PLAN' }],
      undefined
    );
    expect(handlers.onComplete).toHaveBeenCalledWith({
      rowCount: 1,
      queryTime: 12,
    });
  });

  it('reports failures through onError', async () => {
    mockFetch.mockRejectedValue({
      data: { message: 'syntax error at or near "SELCT"' },
    });

    const handlers = {
      onMeta: vi.fn(),
      onRows: vi.fn(),
      onComplete: vi.fn(),
      onError: vi.fn(),
    };

    postgresExplainExecutor.execute(
      {
        connection: { connectionString: 'postgres://x' } as any,
        query: 'EXPLAIN (ANALYZE) SELCT 1',
        params: {},
      },
      handlers
    );

    await vi.waitFor(() => expect(handlers.onError).toHaveBeenCalled());
    expect(handlers.onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'syntax error at or near "SELCT"',
      })
    );
  });

  it('unwraps the driver error from a nested H3 response body', async () => {
    mockFetch.mockRejectedValue({
      data: {
        message: 'x',
        data: { message: 'driver msg', position: '7' },
      },
    });

    const handlers = {
      onMeta: vi.fn(),
      onRows: vi.fn(),
      onComplete: vi.fn(),
      onError: vi.fn(),
    };

    postgresExplainExecutor.execute(
      {
        connection: { connectionString: 'postgres://x' } as any,
        query: 'EXPLAIN SELCT 1',
        params: {},
      },
      handlers
    );

    await vi.waitFor(() => expect(handlers.onError).toHaveBeenCalled());
    expect(handlers.onError).toHaveBeenCalledWith({
      message: 'x',
      detail: { message: 'driver msg', position: '7' },
    });
  });
});
