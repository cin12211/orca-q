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
});
