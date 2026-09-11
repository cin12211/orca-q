import { describe, expect, it, vi } from 'vitest';
import { executeMongoRawQuery } from '~/components/modules/raw-query/mongo/api/executeMongoRawQuery';

const ndjsonResponse = (messages: unknown[]) =>
  new Response(`${messages.map(JSON.stringify).join('\n')}\n`, {
    headers: { 'content-type': 'application/x-ndjson' },
  });

describe('executeMongoRawQuery', () => {
  it('dispatches rows, logs, and completion events', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue(
      ndjsonResponse([
        {
          type: 'meta',
          resultKind: 'cursor',
          fields: [{ name: 'name' }],
          command: 'MONGODB',
        },
        { type: 'rows', data: [{ name: 'Alice' }] },
        { type: 'log', entry: { level: 'log', args: ['loaded'] } },
        { type: 'done', rowCount: 1, queryTime: 4, truncated: false },
      ])
    );
    const options = {
      connectionId: 'c1',
      database: 'db',
      script: 'return 1',
      onMeta: vi.fn(),
      onRows: vi.fn(),
      onLog: vi.fn(),
      onDone: vi.fn(),
      onError: vi.fn(),
    } as any;
    const execution = executeMongoRawQuery(options);
    await execution.finished;
    expect(options.onRows).toHaveBeenCalledWith([{ name: 'Alice' }], 1);
    expect(options.onLog).toHaveBeenCalled();
    expect(options.onDone).toHaveBeenCalledWith(
      expect.objectContaining({ rowCount: 1 })
    );
    globalThis.fetch = originalFetch;
  });
});
