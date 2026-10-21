import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRedisCommandExecutor } from '~/components/modules/driver/redis/raw-query/services';
import { EConnectionMethod } from '~/core/types/entities/connection.entity';

const mockFetch = vi.fn();
(global as any).$fetch = mockFetch;

describe('createRedisCommandExecutor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts the command to the workbench endpoint with the selected database index', async () => {
    mockFetch.mockResolvedValue({ command: ['GET'], result: 'value' });

    const handlers = {
      onMeta: vi.fn(),
      onRows: vi.fn(),
      onComplete: vi.fn(),
      onError: vi.fn(),
    };

    const executor = createRedisCommandExecutor(ref(5));
    executor.execute(
      {
        connection: {
          method: EConnectionMethod.CONNECTION_STRING,
          connectionString: 'redis://127.0.0.1:6379/0',
        } as any,
        query: 'GET foo',
        params: {},
      },
      handlers
    );

    await vi.waitFor(() => expect(handlers.onComplete).toHaveBeenCalled());

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/redis/workbench/execute',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({
          stringConnection: 'redis://127.0.0.1:6379/0',
          databaseIndex: 5,
          command: 'GET foo',
        }),
      })
    );
    expect(handlers.onMeta).toHaveBeenCalledWith([{ name: 'value' }], 'GET');
    expect(handlers.onRows).toHaveBeenCalledWith([{ value: 'value' }], 1);
  });

  it('reports failures through onError', async () => {
    mockFetch.mockRejectedValue({ data: { message: 'WRONGTYPE' } });

    const handlers = {
      onMeta: vi.fn(),
      onRows: vi.fn(),
      onComplete: vi.fn(),
      onError: vi.fn(),
    };

    const executor = createRedisCommandExecutor(ref(0));
    executor.execute(
      {
        connection: { connectionString: 'redis://127.0.0.1:6379/0' } as any,
        query: 'LPUSH foo bar',
        params: {},
      },
      handlers
    );

    await vi.waitFor(() => expect(handlers.onError).toHaveBeenCalled());
    expect(handlers.onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'WRONGTYPE' })
    );
    expect(handlers.onComplete).not.toHaveBeenCalled();
  });
});
