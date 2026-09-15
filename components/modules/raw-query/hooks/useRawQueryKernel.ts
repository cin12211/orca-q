import { computed, ref, watch, type Ref } from 'vue';
import { Compartment, type Extension } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import type BaseCodeEditor from '~/components/base/code-editor/BaseCodeEditor.vue';
import type { Connection } from '~/core/stores';
import type { EditorCursor } from '../interfaces';
import { getRawQueryPlugin } from '../registry/plugins';
import type {
  RawQueryDialectPlugin,
  RawQueryExecutionContext,
} from '../registry/rawQueryPlugin.types';
import type { RawQueryContext } from '../registry/rawQueryProfile.types';
import { useResultTabs } from './useResultTabs';

export interface UseRawQueryKernelOptions<TDialectState = unknown> {
  fileVariables: Ref<string>;
  connection: Ref<Connection | undefined>;
  plugin?: Ref<RawQueryDialectPlugin<TDialectState> | undefined>;
  dialectState?: Ref<TDialectState | undefined> | TDialectState;
  beforeExecute?: () => Promise<boolean>;
  promptMissingVariables?: (
    missing: string[]
  ) => Promise<{ values: Record<string, any>; insertBack: boolean } | null>;
  onUpdateVariables?: (value: string) => void;
  documentText?: Ref<string>;
}

export function useRawQueryKernel<TDialectState = unknown>(
  options: UseRawQueryKernelOptions<TDialectState>
) {
  const codeEditorRef = ref<InstanceType<typeof BaseCodeEditor> | null>(null);
  const resultTabs = useResultTabs();
  const executeLoading = ref(false);
  const isStreaming = ref(false);
  const cursorInfo = ref<EditorCursor>({ line: 1, column: 1 });

  const getEditorView = (): EditorView | null =>
    (codeEditorRef.value?.editorView as EditorView | undefined) ?? null;

  // Active dialect plugin resolution
  const activePlugin = computed<
    RawQueryDialectPlugin<TDialectState> | undefined
  >(() => {
    if (options.plugin?.value) return options.plugin.value;
    const dbType = options.connection.value?.type;
    return getRawQueryPlugin(dbType) as
      | RawQueryDialectPlugin<TDialectState>
      | undefined;
  });

  const getResolvedDialectState = (): TDialectState | undefined => {
    if (
      options.dialectState &&
      typeof options.dialectState === 'object' &&
      'value' in options.dialectState
    ) {
      return (options.dialectState as Ref<TDialectState | undefined>).value;
    }
    return options.dialectState as TDialectState | undefined;
  };

  // CodeMirror extension compartment
  const dialectCompartment = new Compartment();
  const getDialectExtensions = (): Extension[] => {
    const dummyCtx = {
      connection: options.connection.value,
      dialectState: getResolvedDialectState(),
    } as RawQueryContext<TDialectState>;
    return activePlugin.value?.getEditorExtensions?.(dummyCtx) ?? [];
  };

  const extensions = [dialectCompartment.of(getDialectExtensions())];

  const reloadLanguageCompartment = () => {
    const view = getEditorView();
    if (!view) return;
    view.dispatch({
      effects: dialectCompartment.reconfigure(getDialectExtensions()),
    });
  };

  // Watch connection changes to reconfigure editor extensions & preload schema
  watch(
    () => options.connection.value?.id,
    async () => {
      reloadLanguageCompartment();
      if (activePlugin.value?.preloadSchema) {
        const dummyCtx = {
          connection: options.connection.value,
          dialectState: getResolvedDialectState(),
        } as RawQueryContext<TDialectState>;
        await activePlugin.value.preloadSchema(dummyCtx);
      }
    },
    { flush: 'post' }
  );

  // Statement resolution
  const resolveStatement = () => {
    const view = getEditorView();
    if (!view) return null;
    const dummyCtx = {
      connection: options.connection.value,
      dialectState: getResolvedDialectState(),
    } as RawQueryContext<TDialectState>;
    return activePlugin.value?.resolveStatement
      ? activePlugin.value.resolveStatement(view, dummyCtx)
      : null;
  };

  // Code formatting
  const formatCode = async () => {
    const view = getEditorView();
    if (!view) return;
    const source = view.state.doc.toString();
    const dummyCtx = {
      connection: options.connection.value,
      dialectState: getResolvedDialectState(),
    } as RawQueryContext<TDialectState>;
    if (activePlugin.value?.formatCode) {
      const formatted = await activePlugin.value.formatCode(source, dummyCtx);
      if (formatted !== source) {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: formatted },
        });
      }
    }
  };

  // Core execution orchestration
  const onExecuteCurrent = async () => {
    if (!activePlugin.value || executeLoading.value) return;

    const view = getEditorView();
    const statement = resolveStatement();
    const dummyCtx = {
      connection: options.connection.value,
      dialectState: getResolvedDialectState(),
    } as RawQueryContext<TDialectState>;

    const execCtx: RawQueryExecutionContext<TDialectState> = {
      connection: options.connection.value,
      sourceText: view
        ? view.state.doc.toString()
        : (options.documentText?.value ?? ''),
      statement: statement ?? undefined,
      editorView: view,
      dialectState: getResolvedDialectState(),
      context: dummyCtx,
    };

    if (options.beforeExecute) {
      const canProceed = await options.beforeExecute();
      if (!canProceed) return;
    }

    if (activePlugin.value.beforeExecute) {
      const canProceed = await activePlugin.value.beforeExecute(execCtx);
      if (!canProceed) return;
    }

    try {
      executeLoading.value = true;
      const result = await activePlugin.value.execute(execCtx);
      if (activePlugin.value.afterExecute) {
        await activePlugin.value.afterExecute(result, execCtx);
      }
    } finally {
      executeLoading.value = false;
    }
  };

  return {
    codeEditorRef,
    getEditorView,
    resultTabs,
    activePlugin,
    executeLoading,
    isStreaming,
    cursorInfo,
    extensions,
    dialectCompartment,
    reloadLanguageCompartment,
    resolveStatement,
    formatCode,
    onExecuteCurrent,
  };
}

export type RawQueryKernel = ReturnType<typeof useRawQueryKernel>;
