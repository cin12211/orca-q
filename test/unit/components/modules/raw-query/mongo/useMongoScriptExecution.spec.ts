import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { useMongoScriptExecution } from '~/components/modules/raw-query/mongo/hooks/useMongoScriptExecution';

describe('useMongoScriptExecution', () => {
  it('creates one result tab and streams cursor batches into it', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        [
          JSON.stringify({
            type: 'meta',
            resultKind: 'cursor',
            fields: [],
            command: 'MONGODB',
          }),
          JSON.stringify({ type: 'rows', data: [{ name: 'Alice' }] }),
          JSON.stringify({
            type: 'done',
            rowCount: 1,
            queryTime: 5,
            truncated: false,
          }),
          '',
        ].join('\n')
      )
    );
    const resultTabs = {
      addResultTab: vi.fn(),
      refreshResultTab: vi.fn(),
    } as any;
    const hook = useMongoScriptExecution({
      connection: ref({
        id: 'c1',
        type: 'mongodb',
        method: 'direct',
        database: 'db',
      } as any),
      databaseName: ref('db'),
      collectionContext: ref('users'),
      documentText: ref(''),
      fileVariables: ref('{}'),
      fieldDefs: ref([]),
      resultTabs,
    });
    const execution = hook.execute({
      text: "return db.collection('users').find({})",
      from: 0,
      to: 38,
    });
    await execution;
    expect(resultTabs.addResultTab).toHaveBeenCalledOnce();
    globalThis.fetch = originalFetch;
  });

  it('keeps Mongo console entries in the stream order for its result tab', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        [
          JSON.stringify({
            type: 'log',
            entry: { level: 'log', args: ['one'] },
          }),
          JSON.stringify({
            type: 'log',
            entry: { level: 'warn', args: ['two'] },
          }),
          JSON.stringify({
            type: 'done',
            rowCount: 0,
            queryTime: 5,
            truncated: false,
          }),
          '',
        ].join('\n')
      )
    );
    const resultTabs = {
      addResultTab: vi.fn(),
      refreshResultTab: vi.fn(),
    } as any;
    const hook = useMongoScriptExecution({
      connection: ref({
        id: 'c1',
        type: 'mongodb',
        method: 'direct',
        database: 'db',
      } as any),
      databaseName: ref('db'),
      collectionContext: ref('users'),
      documentText: ref("console.log('one'); console.warn('two');"),
      fileVariables: ref('{}'),
      fieldDefs: ref([]),
      resultTabs,
    });

    await hook.execute();

    expect(resultTabs.addResultTab.mock.calls[0][0].metadata.logs).toEqual([
      { level: 'log', args: ['one'] },
      { level: 'warn', args: ['two'] },
    ]);
    globalThis.fetch = originalFetch;
  });

  it('resets the execute state when a running script is cancelled', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockReturnValue(new Promise(() => undefined));
    const resultTabs = {
      addResultTab: vi.fn(),
      refreshResultTab: vi.fn(),
    } as any;
    const hook = useMongoScriptExecution({
      connection: ref({
        id: 'c1',
        type: 'mongodb',
        method: 'direct',
        database: 'db',
      } as any),
      databaseName: ref('db'),
      collectionContext: ref('users'),
      documentText: ref("return db.collection('users').find({})"),
      fileVariables: ref('{}'),
      fieldDefs: ref([]),
      resultTabs,
    });

    void hook.execute();
    await Promise.resolve();

    expect(hook.queryProcessState.executeLoading).toBe(true);

    hook.cancel();

    expect(hook.queryProcessState.executeLoading).toBe(false);
    expect(hook.queryProcessState.isStreaming).toBe(false);
    globalThis.fetch = originalFetch;
  });

  it('executes without a UI database context', async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        [
          JSON.stringify({
            type: 'meta',
            resultKind: 'scalar',
            fields: [],
            command: 'MONGODB',
          }),
          JSON.stringify({ type: 'result', data: { ok: 1 } }),
          JSON.stringify({
            type: 'done',
            rowCount: 1,
            queryTime: 1,
            truncated: false,
          }),
          '',
        ].join('\n')
      )
    );
    globalThis.fetch = fetchMock;
    const resultTabs = {
      addResultTab: vi.fn(),
      refreshResultTab: vi.fn(),
    } as any;
    const hook = useMongoScriptExecution({
      connection: ref({
        id: 'c1',
        type: 'mongodb',
        method: 'direct',
        database: 'connection-default',
      } as any),
      databaseName: ref(undefined),
      collectionContext: ref(undefined),
      documentText: ref(
        "return db.getSiblingDB('analytics').command({ ping: 1 })"
      ),
      fileVariables: ref('{}'),
      fieldDefs: ref([]),
      resultTabs,
    });

    await hook.execute();

    const request = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);
    expect(request).not.toHaveProperty('database');
    expect(request.script).toContain("getSiblingDB('analytics')");
    globalThis.fetch = originalFetch;
  });
});
