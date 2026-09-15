import { computed, ref, shallowRef } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { RawQueryEditorLayout } from '~/components/modules/raw-query/constants';
import {
  createRawQueryContext,
  provideRawQueryContext,
  useRawQueryContext,
} from '~/components/modules/raw-query/hooks/useRawQueryContext';
import {
  mongoPlugin,
  type MongoDialectState,
} from '~/components/modules/raw-query/registry/plugins/mongo.plugin';
import type { RawQueryContext } from '~/components/modules/raw-query/registry/rawQueryPlugin.types';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { Connection } from '~/core/stores';

describe('useRawQueryContext & createRawQueryContext', () => {
  it('creates a unified reactive context with all header, footer, and editor properties', () => {
    const workspaceId = ref('ws-123');
    const selectedConnectionId = ref('conn-abc');
    const connection = ref<Connection | undefined>({
      id: 'conn-abc',
      name: 'Test DB',
      type: DatabaseClientType.MONGODB,
      workspaceId: 'ws-123',
    } as Connection);
    const connections = ref<Connection[]>([connection.value!]);
    const fileContents = ref('db.test.find()');
    const fileVariables = ref('{}');

    const onHandleFormatCurrentStatement = vi.fn();
    const onHandleFormatCode = vi.fn();
    const onExecuteCurrent = vi.fn();
    const cancelStreamingQuery = vi.fn();

    const mockEditor = {
      cursorInfo: ref({ line: 10, column: 20 }),
      queryProcessState: ref({ executeLoading: false, isStreaming: false }),
      explainAnalyzeOptionItems: [],
      serializeMode: ref('NONE'),
      onHandleFormatCurrentStatement,
      onHandleFormatCode,
      onExecuteCurrent,
      cancelStreamingQuery,
    } as any;

    const dialectState = ref<MongoDialectState | undefined>({
      badgeText: ref('MongoDB Beta'),
      clickCount: ref(3),
      incrementCount: vi.fn(),
      resetCount: vi.fn(),
    });

    const context = createRawQueryContext({
      workspaceId,
      connection,
      connections,
      selectedConnectionId,
      databaseType: computed(() => connection.value?.type),
      disableConnectionSwitch: false,
      currentFile: undefined,
      fileContents,
      fileVariables,
      codeEditorLayout: RawQueryEditorLayout.horizontal,
      rawQueryEditor: mockEditor,
      dialectState,
    });

    // Verify basic properties
    expect(context.workspaceId).toBe('ws-123');
    expect(context.selectedConnectionId).toBe('conn-abc');
    expect(context.databaseType).toBe(DatabaseClientType.MONGODB);
    expect(context.connection?.name).toBe('Test DB');
    expect(context.cursorInfo).toEqual({ line: 10, column: 20 });
    expect(context.executeLoading).toBe(false);
    expect(context.isStreaming).toBe(false);

    // Verify method bindings
    context.onFormatCurrentStatement?.();
    expect(onHandleFormatCurrentStatement).toHaveBeenCalledTimes(1);

    context.onFormatAll?.();
    expect(onHandleFormatCode).toHaveBeenCalledTimes(1);

    context.onExecuteCurrent?.();
    expect(onExecuteCurrent).toHaveBeenCalledTimes(1);

    context.onCancelQuery?.();
    expect(cancelStreamingQuery).toHaveBeenCalledTimes(1);

    // Verify reactive updates
    workspaceId.value = 'ws-999';
    expect(context.workspaceId).toBe('ws-999');

    mockEditor.cursorInfo.value = { line: 42, column: 1 };
    expect(context.cursorInfo).toEqual({ line: 42, column: 1 });
  });

  it('supports basic generic type RawQueryContext<MongoDialectState>', () => {
    // Basic generic type test directly with MongoDialectState
    const testState: MongoDialectState = {
      badgeText: ref('MongoDB Beta'),
      clickCount: ref(0),
      incrementCount: () => {},
      resetCount: () => {},
    };

    const typedContext: RawQueryContext<MongoDialectState> = {
      workspaceId: 'ws-1',
      selectedConnectionId: 'conn-1',
      connections: [],
      disableConnectionSwitch: false,
      fileContents: '',
      fileVariables: '',
      codeEditorLayout: RawQueryEditorLayout.horizontal,
      isFormatSupported: true,
      isVariableSupported: false,
      isExplainSupported: false,
      cursorInfo: { line: 1, column: 1 },
      executeLoading: false,
      isStreaming: false,
      dialectState: testState,
    };

    expect(typedContext.dialectState?.badgeText.value).toBe('MongoDB Beta');
    expect(typedContext.dialectState?.clickCount.value).toBe(0);
  });
});
