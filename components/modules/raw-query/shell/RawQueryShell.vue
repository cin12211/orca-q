<script setup lang="ts">
import { LoadingOverlay } from '#components';
import type { EditorView, KeyBinding } from '@codemirror/view';
import BaseCodeEditor from '~/components/base/code-editor/BaseCodeEditor.vue';
import type { ContextMenuItem } from '~/components/base/context-menu/menuContext.type';
import { useHotkeys } from '~/core/composables/useHotKeys';
import { useEnvironmentTagStore } from '~/core/stores';
import { useAppConfigStore } from '~/core/stores/appConfigStore';
import IntroRawQuery from '../components/IntroRawQuery.vue';
import MissingVariablesDialog from '../components/MissingVariablesDialog.vue';
import RawQueryConnectionConfirmDialog from '../components/RawQueryConnectionConfirmDialog.vue';
import RawQueryEditorContextMenu from '../components/RawQueryEditorContextMenu.vue';
import RawQueryEditorFooter from '../components/RawQueryEditorFooter.vue';
import RawQueryEditorHeader from '../components/RawQueryEditorHeader.vue';
import RawQueryLayout from '../components/RawQueryLayout.vue';
import RawQueryResultTabs from '../components/RawQueryResultTabs.vue';
import VariableEditor from '../components/VariableEditor.vue';
import type {
  CommandResultHandlerResolver,
  RawQueryDriverDescriptor,
  RawQueryExecutor,
} from '../contracts';
import { useRawQueryCore, useRawQueryFileContentContext } from '../hooks';
import { useRawQueryEditorContextMenu } from '../hooks/useRawQueryEditorContextMenu';
import { ViewMode } from '../interfaces';

const props = withDefaults(
  defineProps<{
    /** Static engine configuration: capabilities + command result handler. */
    descriptor: RawQueryDriverDescriptor;
    /** Engine executor. Redis builds it from a reactive database index. */
    executor: RawQueryExecutor;
    /** Resolves the summary handler per result tab, not per selected connection. */
    resolveCommandResultHandler: CommandResultHandlerResolver;
    isSupportVariable?: boolean;
    /** Extra keybindings contributed by the engine, e.g. PostgreSQL's Mod-e. */
    extraKeymap?: KeyBinding[];
    /** Extra editor context-menu entries contributed by the engine. */
    extraContextMenuItems?: ContextMenuItem[];
  }>(),
  {
    isSupportVariable: true,
  }
);

const route = useRoute('workspaceId-connectionId-explorer-fileId');
const workspaceId = computed(() => {
  const value = route.params.workspaceId;
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
});
const appConfigStore = useAppConfigStore();
const tagStore = useEnvironmentTagStore();
const rawQueryFileContent = useRawQueryFileContentContext();
const {
  connection,
  currentFile,
  currentOpenedConnection,
  fileContents,
  fileVariables,
  selectedConnectionId,
  updateSelectedConnection,
  updateFileContent,
  updateFileVariables,
  connectionsByWsId,
  fieldDefs,
} = rawQueryFileContent;

const capabilities = computed(() => props.descriptor.capabilities);
const isFormatSupported = computed(() => capabilities.value.supportsFormat);
// Explain is SQL-only; Redis has no query plan to show.
const supportedViews = computed(() => {
  const views = [
    ViewMode.RESULT,
    ViewMode.EXPLAIN,
    ViewMode.RAW,
    ViewMode.INFO,
    ViewMode.CHART,
    ViewMode.ERROR,
  ];
  return capabilities.value.language === 'sql'
    ? views
    : views.filter(view => view !== ViewMode.EXPLAIN);
});
const isVariableSupported = computed(
  () => props.isSupportVariable && capabilities.value.supportsVariables
);
const effectiveFileVariables = ref('');

watchEffect(() => {
  effectiveFileVariables.value = isVariableSupported.value
    ? fileVariables.value
    : '';
});

const isMissingVariablesOpen = ref(false);
const missingVariablesList = ref<string[]>([]);
let resolveMissingVariables:
  | ((
      value: { values: Record<string, any>; insertBack: boolean } | null
    ) => void)
  | null = null;

const promptMissingVariables = (missing: string[]) => {
  missingVariablesList.value = missing;
  isMissingVariablesOpen.value = true;
  return new Promise<{
    values: Record<string, any>;
    insertBack: boolean;
  } | null>(resolve => {
    resolveMissingVariables = resolve;
  });
};

const onConfirmMissingVariables = (
  values: Record<string, any>,
  insertBack: boolean
) => {
  isMissingVariablesOpen.value = false;
  resolveMissingVariables?.({ values, insertBack });
  resolveMissingVariables = null;
};

const onCancelMissingVariables = () => {
  isMissingVariablesOpen.value = false;
  resolveMissingVariables?.(null);
  resolveMissingVariables = null;
};

const rawQueryEditor = useRawQueryCore({
  descriptor: toRef(props, 'descriptor'),
  executor: toRef(props, 'executor'),
  connection,
  fieldDefs,
  fileVariables: effectiveFileVariables,
  extraKeymap: props.extraKeymap,
  beforeExecute: () => requestConnectionExecutionConfirm(),
  promptMissingVariables,
  onUpdateVariables: updateFileVariables,
});
const {
  cursorInfo,
  extensions,
  codeEditorRef,
  onExecuteCurrent,
  onHandleFormatCode,
  onHandleFormatCurrentStatement,
  queryProcessState,
  executedResults,
  activeResultTabId,
} = rawQueryEditor;

const engineContextMenuItems = computed<ContextMenuItem[]>(
  () => props.extraContextMenuItems ?? []
);

const { contextMenuItems, onContextMenuOpen } = useRawQueryEditorContextMenu({
  onExecuteCurrent: rawQueryEditor.onExecuteCurrent,
  onHandleFormatCurrentStatement: rawQueryEditor.onHandleFormatCurrentStatement,
  onHandleFormatCode: rawQueryEditor.onHandleFormatCode,
  isSupportFormat: isFormatSupported,
  extraItems: engineContextMenuItems,
  getEditorView: () =>
    codeEditorRef.value?.editorView as EditorView | null | undefined,
});

const scrollTop = ref(0);

const showResultPanel = ref(true);
const isConnectionExecutionConfirmOpen = ref(false);
const executionConfirmTargetConnectionName = ref('');
const executionConfirmCurrentConnectionName = ref('');
let resolveConnectionExecutionConfirm: ((value: boolean) => void) | null = null;

const isCurrentConnectionStrictMode = computed(() => {
  if (!currentOpenedConnection.value) {
    return false;
  }

  return tagStore
    .getTagsByIds(currentOpenedConnection.value.tagIds ?? [])
    .some(tag => tag.strictMode);
});

const requestConnectionExecutionConfirm = () => {
  const selectedConnection = connection.value;
  const currentConnection = currentOpenedConnection.value;

  if (
    !selectedConnection ||
    !currentConnection ||
    selectedConnection.id === currentConnection.id
  ) {
    return Promise.resolve(true);
  }

  if (isConnectionExecutionConfirmOpen.value) {
    return Promise.resolve(false);
  }

  executionConfirmTargetConnectionName.value = selectedConnection.name;
  executionConfirmCurrentConnectionName.value = currentConnection.name;
  isConnectionExecutionConfirmOpen.value = true;

  return new Promise<boolean>(resolve => {
    resolveConnectionExecutionConfirm = resolve;
  });
};

const onConfirmConnectionExecution = () => {
  isConnectionExecutionConfirmOpen.value = false;
  resolveConnectionExecutionConfirm?.(true);
  resolveConnectionExecutionConfirm = null;
};

const onCancelConnectionExecution = () => {
  isConnectionExecutionConfirmOpen.value = false;
  resolveConnectionExecutionConfirm?.(false);
  resolveConnectionExecutionConfirm = null;
};

useHotkeys([
  {
    key: 'mod+j',
    callback: () => {
      showResultPanel.value = !showResultPanel.value;
    },
  },
  {
    key: 'ctrl+j',
    callback: () => {
      showResultPanel.value = !showResultPanel.value;
    },
  },
]);

watch(effectiveFileVariables, () => {
  rawQueryEditor.reloadSqlCompartment();
});

const onUpdateCursorInfo = ({
  column,
  from,
  line,
  to,
}: {
  line: number;
  column: number;
  from: number;
  to: number;
}) => {
  cursorInfo.value = {
    column,
    line,
  };

  rawQueryFileContent.updateFileCursorPos({
    from,
    to,
  });
};

const restoreCursorPos = (allowScroll = true) => {
  if (!currentFile.value?.cursorPos || !codeEditorRef.value?.editorView) return;
  const from = currentFile.value.cursorPos.from ?? 0;
  const to = currentFile.value.cursorPos.to || 0;
  codeEditorRef.value.setCursorPosition({ from, to, allowScroll });
};

const isEditorLoading = ref(!rawQueryFileContent.isFromCache);

onMounted(async () => {
  if (isEditorLoading.value) {
    await rawQueryFileContent.loadFileContent();
    isEditorLoading.value = false;
    await nextTick();
  }
  restoreCursorPos();
});

onActivated(async () => {
  await nextTick();
  restoreCursorPos(false);
  if (codeEditorRef.value?.editorView) {
    codeEditorRef.value.editorView.scrollDOM.scrollTop = scrollTop.value;
  }
});

onBeforeUnmount(() => {
  if (resolveConnectionExecutionConfirm) {
    resolveConnectionExecutionConfirm(false);
    resolveConnectionExecutionConfirm = null;
  }
});

// Engine entries drive extra executions (e.g. PostgreSQL EXPLAIN) through these.
defineExpose({
  executeCurrentStatement: rawQueryEditor.executeCurrentStatement,
  getEditorView: rawQueryEditor.getEditorView,
});
</script>

<template>
  <RawQueryConnectionConfirmDialog
    :open="isConnectionExecutionConfirmOpen"
    :target-connection-name="executionConfirmTargetConnectionName"
    :current-connection-name="executionConfirmCurrentConnectionName"
    @confirm="onConfirmConnectionExecution"
    @cancel="onCancelConnectionExecution"
  />

  <MissingVariablesDialog
    :open="isMissingVariablesOpen"
    :missing-variables="missingVariablesList"
    @confirm="onConfirmMissingVariables"
    @cancel="onCancelMissingVariables"
  />

  <RawQueryLayout
    :layout="appConfigStore.codeEditorLayout"
    :customLayout="appConfigStore.activeCustomLayout"
    :show-result-panel="showResultPanel"
  >
    <template #content>
      <div class="flex flex-col h-full p-1">
        <div class="flex flex-col h-full border rounded-md">
          <RawQueryEditorHeader
            @update:connectionId="updateSelectedConnection"
            :connections="connectionsByWsId"
            :connection="connection"
            :selected-connection-id="selectedConnectionId"
            :disable-connection-switch="isCurrentConnectionStrictMode"
            :workspaceId="workspaceId"
            :file-variables="fileVariables"
            :code-editor-layout="appConfigStore.codeEditorLayout"
            :currentFileInfo="currentFile"
            :is-support-variable="isVariableSupported"
            @update:update-file-variables="updateFileVariables"
          >
            <template #extra>
              <slot name="header-extra" />
            </template>
          </RawQueryEditorHeader>
          <div class="h-full flex flex-col overflow-y-auto">
            <RawQueryEditorContextMenu
              :context-menu-items="contextMenuItems"
              @update:open="onContextMenuOpen"
            >
              <LoadingOverlay v-if="isEditorLoading" visible />

              <BaseCodeEditor
                v-else
                @update:modelValue="updateFileContent"
                @update:cursorInfo="onUpdateCursorInfo"
                @update:onScrollTop="scrollTop = $event"
                :modelValue="fileContents"
                :extensions="extensions"
                ref="codeEditorRef"
              />
            </RawQueryEditorContextMenu>
          </div>

          <RawQueryEditorFooter
            :cursor-info="cursorInfo"
            :execute-loading="queryProcessState.executeLoading"
            :is-streaming="queryProcessState.isStreaming"
            :is-support-format="isFormatSupported"
            :is-support-variable="isVariableSupported"
            @on-format-current-statement="onHandleFormatCurrentStatement"
            @on-format-all="onHandleFormatCode"
            @on-execute-current="onExecuteCurrent"
            @on-cancel-query="rawQueryEditor.cancelStreamingQuery"
          >
            <template #extra>
              <slot name="footer-extra" />
            </template>
          </RawQueryEditorFooter>
        </div>
      </div>
    </template>

    <template #variables>
      <div class="flex flex-col h-full border rounded-md bg-muted">
        <div class="flex items-center gap-1 font-normal text-sm px-2 py-1">
          <Icon name="hugeicons:absolute" />
          Variables
        </div>

        <div class="h-full flex flex-col overflow-y-auto">
          <BaseEmpty
            v-if="!isVariableSupported"
            title="Variables not supported"
            desc="Variables are not available for Redis connections."
            icon="icons:ghost"
          />

          <VariableEditor
            v-else
            :variables="fileVariables"
            @update:variables="updateFileVariables"
            @updateVariables="updateFileVariables"
            :file-variables="fileVariables"
          />
        </div>
      </div>
    </template>

    <template #result>
      <IntroRawQuery v-if="executedResults.size === 0" />

      <RawQueryResultTabs
        v-else
        :executed-results="executedResults"
        :active-tab-id="activeResultTabId"
        :execute-loading="queryProcessState.executeLoading"
        :is-streaming="queryProcessState.isStreaming"
        :resolve-command-result-handler="resolveCommandResultHandler"
        :supported-views="supportedViews"
        @update:active-tab="rawQueryEditor.setActiveResultTab"
        @close-tab="rawQueryEditor.closeResultTab"
        @close-other-tabs="rawQueryEditor.closeOtherResultTabs"
        @close-tabs-to-right="rawQueryEditor.closeResultTabsToRight"
        @update:view="rawQueryEditor.updateResultTabView"
      >
        <template #result-view="slotProps">
          <slot name="result-view" v-bind="slotProps" />
        </template>
      </RawQueryResultTabs>
    </template>
  </RawQueryLayout>
</template>
