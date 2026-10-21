import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as streamingQuery from '~/components/modules/raw-query/hooks/useStreamingQuery';
import { sqlStreamingExecutor } from '~/components/modules/raw-query/services';

vi.mock('~/components/modules/raw-query/hooks/useStreamingQuery', () => ({
  executeStreamingQuery: vi.fn(),
}));

describe('sqlStreamingExecutor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('forwards streaming callbacks onto the executor handlers', () => {
    const abort = vi.fn();
    vi.mocked(streamingQuery.executeStreamingQuery).mockImplementation(
      (options: any) => {
        options.onMeta([{ name: 'id' }], 'SELECT');
        options.onRows([{ id: 1 }], 1);
        options.onDone(1, 42);
        return { abort };
      }
    );

    const handlers = {
      onMeta: vi.fn(),
      onRows: vi.fn(),
      onComplete: vi.fn(),
      onError: vi.fn(),
    };

    const handle = sqlStreamingExecutor.execute(
      {
        connection: { connectionString: 'postgres://x' } as any,
        query: 'SELECT 1',
        params: {},
      },
      handlers
    );

    expect(handlers.onMeta).toHaveBeenCalledWith([{ name: 'id' }], 'SELECT');
    expect(handlers.onRows).toHaveBeenCalledWith([{ id: 1 }], 1);
    expect(handlers.onComplete).toHaveBeenCalledWith({
      rowCount: 1,
      queryTime: 42,
    });
    expect(handlers.onError).not.toHaveBeenCalled();

    handle.abort();
    expect(abort).toHaveBeenCalled();
  });

  it('forwards stream errors onto onError', () => {
    vi.mocked(streamingQuery.executeStreamingQuery).mockImplementation(
      (options: any) => {
        options.onError('boom', { message: 'boom' });
        return { abort: vi.fn() };
      }
    );

    const handlers = {
      onMeta: vi.fn(),
      onRows: vi.fn(),
      onComplete: vi.fn(),
      onError: vi.fn(),
    };

    sqlStreamingExecutor.execute(
      {
        connection: { connectionString: 'postgres://x' } as any,
        query: 'SELECT bad',
        params: {},
      },
      handlers
    );

    expect(handlers.onError).toHaveBeenCalledWith({
      message: 'boom',
      detail: { message: 'boom' },
    });
  });

  it('is flagged as a streaming executor', () => {
    expect(sqlStreamingExecutor.streaming).toBe(true);
  });
});
