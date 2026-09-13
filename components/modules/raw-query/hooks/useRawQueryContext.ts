import type { ComputedRef, InjectionKey, Ref } from 'vue';
import { inject, provide } from 'vue';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { Connection, RowQueryFile } from '~/core/stores';
import type { RedisDatabaseOption } from '~/core/types/redis-workspace.types';
import type { RawQueryEditorLayout } from '../constants';
import type { RawQueryEditor } from './useRawQueryEditor';

export interface RawQueryContext {
  // Routing & Workspace
  workspaceId: ComputedRef<string> | Ref<string>;

  // Connection info
  connection: Ref<Connection | undefined>;
  connections: Ref<Connection[]>;
  selectedConnectionId: Ref<string>;
  databaseType:
    | ComputedRef<DatabaseClientType | undefined>
    | Ref<DatabaseClientType | undefined>;
  disableConnectionSwitch: ComputedRef<boolean> | Ref<boolean>;
  updateSelectedConnection: (connectionId: string) => void;

  // File info
  currentFile: Ref<RowQueryFile | undefined>;
  fileContents: Ref<string>;
  fileVariables: Ref<string>;
  updateFileContent: (value: string) => void;
  updateFileVariables: (variables: string) => Promise<void>;

  // Redis workspace info
  redisDatabases:
    | Ref<RedisDatabaseOption[]>
    | ComputedRef<RedisDatabaseOption[]>;
  redisDatabaseIndex: Ref<number>;
  updateRedisDatabaseIndex: (index: number) => void;

  // Feature support flags
  isVariableSupported: ComputedRef<boolean> | Ref<boolean>;
  isFormatSupported: ComputedRef<boolean> | Ref<boolean>;
  isExplainSupported: ComputedRef<boolean> | Ref<boolean>;

  // Editor instance
  rawQueryEditor: RawQueryEditor;

  // Layout & UI
  codeEditorLayout:
    | ComputedRef<RawQueryEditorLayout>
    | Ref<RawQueryEditorLayout>;
}

export const RAW_QUERY_CONTEXT_KEY: InjectionKey<RawQueryContext> =
  Symbol('raw-query-context');

export function provideRawQueryContext(
  context: RawQueryContext
): RawQueryContext {
  provide(RAW_QUERY_CONTEXT_KEY, context);
  return context;
}

export function useRawQueryContext(): RawQueryContext | undefined {
  return inject(RAW_QUERY_CONTEXT_KEY, undefined);
}
