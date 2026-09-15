import type { InjectionKey, MaybeRefOrGetter } from 'vue';
import { inject, provide, reactive, toValue } from 'vue';
import type { DatabaseClientType } from '~/core/constants/database-client-type';
import type { Connection, RowQueryFile } from '~/core/stores';
import { RawQueryEditorLayout } from '../constants';
import type { RawQueryContext } from '../registry/rawQueryPlugin.types';
import type { RawQueryEditor } from './useRawQueryEditor';

export interface CreateRawQueryContextOptions<
  TDialectState = Record<string, any>,
> {
  workspaceId: MaybeRefOrGetter<string>;
  connection: MaybeRefOrGetter<Connection | undefined>;
  connections: MaybeRefOrGetter<Connection[]>;
  selectedConnectionId: MaybeRefOrGetter<string>;
  databaseType?: MaybeRefOrGetter<DatabaseClientType | undefined>;
  disableConnectionSwitch?: MaybeRefOrGetter<boolean>;
  updateSelectedConnection?: (connectionId: string) => void;
  currentFile?: MaybeRefOrGetter<RowQueryFile | undefined>;
  fileContents?: MaybeRefOrGetter<string>;
  fileVariables?: MaybeRefOrGetter<string>;
  updateFileContent?: (value: string) => void;
  updateFileVariables?: (variables: string) => Promise<void> | void;
  isVariableSupported?: MaybeRefOrGetter<boolean>;
  isFormatSupported?: MaybeRefOrGetter<boolean>;
  isExplainSupported?: MaybeRefOrGetter<boolean>;
  codeEditorLayout?: MaybeRefOrGetter<RawQueryEditorLayout>;
  rawQueryEditor?: RawQueryEditor;
  dialectState?: MaybeRefOrGetter<TDialectState | undefined>;
  isRawViewMode?: MaybeRefOrGetter<boolean | undefined>;
  updateRawViewMode?: (value: boolean) => void;
}

/**
 * Creates the master reactive RawQueryContext.
 * Binds all reactive getters and action methods into a single unified context object.
 */
export function createRawQueryContext<TDialectState = Record<string, any>>(
  options: CreateRawQueryContextOptions<TDialectState>
): RawQueryContext<TDialectState> {
  return reactive<RawQueryContext<TDialectState>>({
    get workspaceId() {
      return toValue(options.workspaceId) ?? '';
    },
    get selectedConnectionId() {
      return toValue(options.selectedConnectionId) ?? '';
    },
    get connection() {
      return toValue(options.connection);
    },
    get connections() {
      return toValue(options.connections) ?? [];
    },
    get disableConnectionSwitch() {
      return toValue(options.disableConnectionSwitch) ?? false;
    },
    get databaseType() {
      return toValue(options.databaseType) ?? toValue(options.connection)?.type;
    },
    get currentFileInfo() {
      return toValue(options.currentFile);
    },
    get currentFile() {
      return toValue(options.currentFile);
    },
    get fileContents() {
      return toValue(options.fileContents) ?? '';
    },
    get fileVariables() {
      return toValue(options.fileVariables) ?? '';
    },
    get codeEditorLayout() {
      return (
        toValue(options.codeEditorLayout) ?? RawQueryEditorLayout.horizontal
      );
    },
    get isFormatSupported() {
      return toValue(options.isFormatSupported) ?? true;
    },
    get isVariableSupported() {
      return toValue(options.isVariableSupported) ?? true;
    },
    get isExplainSupported() {
      return toValue(options.isExplainSupported) ?? false;
    },
    get rawQueryEditor() {
      return options.rawQueryEditor;
    },
    get editor() {
      return options.rawQueryEditor;
    },
    get cursorInfo() {
      return (
        toValue(options.rawQueryEditor?.cursorInfo) ?? { line: 1, column: 1 }
      );
    },
    get executeLoading() {
      return (
        toValue(options.rawQueryEditor?.queryProcessState)?.executeLoading ??
        false
      );
    },
    get isStreaming() {
      return (
        toValue(options.rawQueryEditor?.queryProcessState)?.isStreaming ?? false
      );
    },
    get isRawViewMode() {
      return toValue(options.isRawViewMode);
    },
    get explainAnalyzeOptionItems() {
      return toValue(options.rawQueryEditor?.explainAnalyzeOptionItems) ?? [];
    },
    get serializeMode() {
      return toValue(options.rawQueryEditor?.serializeMode);
    },
    get dialectState() {
      return toValue(options.dialectState);
    },
    onUpdateConnectionId: options.updateSelectedConnection,
    onUpdateFileVariables: options.updateFileVariables,
    onUpdateFileContent: options.updateFileContent,
    onFormatCurrentStatement: () => {
      options.rawQueryEditor?.onHandleFormatCurrentStatement();
    },
    onFormatAll: () => {
      options.rawQueryEditor?.onHandleFormatCode();
    },
    onExplainAnalyzeCurrent: () => {
      options.rawQueryEditor?.onExplainAnalyzeCurrent();
    },
    toggleExplainOption: key => {
      options.rawQueryEditor?.toggleExplainOption(key);
    },
    updateSerializeMode: mode => {
      options.rawQueryEditor?.setSerializeMode(mode);
    },
    onExecuteCurrent: () => {
      options.rawQueryEditor?.onExecuteCurrent();
    },
    updateRawViewMode: options.updateRawViewMode,
    onCancelQuery: () => {
      options.rawQueryEditor?.cancelStreamingQuery();
    },
  }) as RawQueryContext<TDialectState>;
}

export const RAW_QUERY_CONTEXT_KEY: InjectionKey<RawQueryContext<any>> =
  Symbol('raw-query-context');

export function provideRawQueryContext<TDialectState = Record<string, any>>(
  context: RawQueryContext<TDialectState>
): RawQueryContext<TDialectState> {
  provide(RAW_QUERY_CONTEXT_KEY, context);
  return context;
}

/**
 * Access the unified RawQueryContext.
 * Accepts an optional dialect state generic type to ensure type safety.
 *
 * Examples:
 * - `const ctx = useRawQueryContext();` // default Record<string, any>
 * - `const ctx = useRawQueryContext<MongoDialectState>();` // typed with Mongo state
 */
export function useRawQueryContext<TDialectState = Record<string, any>>():
  | RawQueryContext<TDialectState>
  | undefined {
  const injected = inject(RAW_QUERY_CONTEXT_KEY, undefined) as any;
  if (!injected) {
    return undefined;
  }

  // Fast path: already normalized via createRawQueryContext
  if (typeof injected.onFormatCurrentStatement === 'function') {
    return injected as RawQueryContext<TDialectState>;
  }

  // Adapter path: support test mocks or partial context injection gracefully
  const editor = toValue(injected.rawQueryEditor) ?? toValue(injected.editor);
  const normalized = reactive({
    ...injected,
    get workspaceId() {
      return toValue(injected.workspaceId) ?? '';
    },
    get selectedConnectionId() {
      return toValue(injected.selectedConnectionId) ?? '';
    },
    get connection() {
      return toValue(injected.connection);
    },
    get connections() {
      return toValue(injected.connections) ?? [];
    },
    get disableConnectionSwitch() {
      return toValue(injected.disableConnectionSwitch) ?? false;
    },
    get databaseType() {
      return (
        toValue(injected.databaseType) ?? toValue(injected.connection)?.type
      );
    },
    get currentFileInfo() {
      return toValue(injected.currentFileInfo) ?? toValue(injected.currentFile);
    },
    get currentFile() {
      return toValue(injected.currentFile) ?? toValue(injected.currentFileInfo);
    },
    get fileContents() {
      return toValue(injected.fileContents) ?? '';
    },
    get fileVariables() {
      return toValue(injected.fileVariables) ?? '';
    },
    get codeEditorLayout() {
      return (
        toValue(injected.codeEditorLayout) ?? RawQueryEditorLayout.horizontal
      );
    },
    get isFormatSupported() {
      return toValue(injected.isFormatSupported) ?? true;
    },
    get isVariableSupported() {
      return toValue(injected.isVariableSupported) ?? true;
    },
    get isExplainSupported() {
      return toValue(injected.isExplainSupported) ?? false;
    },
    get rawQueryEditor() {
      return editor;
    },
    get editor() {
      return editor;
    },
    get cursorInfo() {
      return (
        toValue(injected.cursorInfo) ??
        toValue(editor?.cursorInfo) ?? { line: 1, column: 1 }
      );
    },
    get executeLoading() {
      return (
        toValue(injected.executeLoading) ??
        toValue(editor?.queryProcessState)?.executeLoading ??
        false
      );
    },
    get isStreaming() {
      return (
        toValue(injected.isStreaming) ??
        toValue(editor?.queryProcessState)?.isStreaming ??
        false
      );
    },
    get explainAnalyzeOptionItems() {
      return (
        toValue(injected.explainAnalyzeOptionItems) ??
        toValue(editor?.explainAnalyzeOptionItems) ??
        []
      );
    },
    get serializeMode() {
      return toValue(injected.serializeMode) ?? toValue(editor?.serializeMode);
    },
    get dialectState() {
      return toValue(injected.dialectState) ?? {};
    },
    onUpdateConnectionId:
      injected.onUpdateConnectionId ?? injected.updateSelectedConnection,
    onUpdateFileVariables:
      injected.onUpdateFileVariables ?? injected.updateFileVariables,
    onUpdateFileContent:
      injected.onUpdateFileContent ?? injected.updateFileContent,
    onFormatCurrentStatement: () => {
      if (typeof injected.onFormatCurrentStatement === 'function') {
        injected.onFormatCurrentStatement();
      } else {
        editor?.onHandleFormatCurrentStatement?.();
      }
    },
    onFormatAll: () => {
      if (typeof injected.onFormatAll === 'function') {
        injected.onFormatAll();
      } else {
        editor?.onHandleFormatCode?.();
      }
    },
    onExplainAnalyzeCurrent: () => {
      if (typeof injected.onExplainAnalyzeCurrent === 'function') {
        injected.onExplainAnalyzeCurrent();
      } else {
        editor?.onExplainAnalyzeCurrent?.();
      }
    },
    toggleExplainOption: (key: any) => {
      if (typeof injected.toggleExplainOption === 'function') {
        injected.toggleExplainOption(key);
      } else {
        editor?.toggleExplainOption?.(key);
      }
    },
    updateSerializeMode: (mode: any) => {
      if (typeof injected.updateSerializeMode === 'function') {
        injected.updateSerializeMode(mode);
      } else {
        editor?.setSerializeMode?.(mode);
      }
    },
    onExecuteCurrent: () => {
      if (typeof injected.onExecuteCurrent === 'function') {
        injected.onExecuteCurrent();
      } else {
        editor?.onExecuteCurrent?.();
      }
    },
    onCancelQuery: () => {
      if (typeof injected.onCancelQuery === 'function') {
        injected.onCancelQuery();
      } else {
        editor?.cancelStreamingQuery?.();
      }
    },
  });

  return normalized as RawQueryContext<TDialectState>;
}

export type { RawQueryContext };
