<script setup lang="ts">
import { LoadingOverlay } from '#components';
import type { EditorView } from '@codemirror/view';
import { useEnvironmentTagStore } from '@/components/modules/environment-tag';
import BaseCodeEditor from '~/components/base/code-editor/BaseCodeEditor.vue';
import { useHotkeys } from '~/core/composables/useHotKeys';
import { useAppConfigStore } from '~/core/stores/appConfigStore';
import IntroRawQuery from './components/IntroRawQuery.vue';
import RawQueryConnectionConfirmDialog from './components/RawQueryConnectionConfirmDialog.vue';
import RawQueryEditorContextMenu from './components/RawQueryEditorContextMenu.vue';
import RawQueryEditorFooter from './components/RawQueryEditorFooter.vue';
import RawQueryEditorHeader from './components/RawQueryEditorHeader.vue';
import RawQueryLayout from './components/RawQueryLayout.vue';
import RawQueryResultTabs from './components/RawQueryResultTabs.vue';
import VariableEditor from './components/VariableEditor.vue';
import { useRawQueryEditor, useRawQueryFileContent } from './hooks';
import { useRawQueryEditorContextMenu } from './hooks/useRawQueryEditorContextMenu';

const route = useRoute('workspaceId-connectionId-explorer-fileId');
const appConfigStore = useAppConfigStore();
const tagStore = useEnvironmentTagStore();
const rawQueryFileContent = useRawQueryFileContent();
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
} = toRefs(rawQueryFileContent);

const rawQueryEditor = useRawQueryEditor({
  connection,
  fieldDefs,
  fileVariables,
  beforeExecute: () => requestConnectionExecutionConfirm(),
});
const {
  cursorInfo,
  extensions,
  codeEditorRef,
  onExecuteCurrent,
  onHandleFormatCode,
  onHandleFormatCurrentStatement,
  onExplainAnalyzeCurrent,
  explainAnalyzeOptionItems,
  serializeMode,
  currentRawQueryResult,
  queryProcessState,
  executedResults,
  activeResultTabId,
} = toRefs(rawQueryEditor);

const { contextMenuItems, onContextMenuOpen } = useRawQueryEditorContextMenu({
  onExecuteCurrent: rawQueryEditor.onExecuteCurrent,
  onExplainAnalyzeCurrent: rawQueryEditor.onExplainAnalyzeCurrent,
  onHandleFormatCurrentStatement: rawQueryEditor.onHandleFormatCurrentStatement,
  onHandleFormatCode: rawQueryEditor.onHandleFormatCode,
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

watch(fileVariables, () => {
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
</script>

<template>
  <RawQueryConnectionConfirmDialog
    :open="isConnectionExecutionConfirmOpen"
    :target-connection-name="executionConfirmTargetConnectionName"
    :current-connection-name="executionConfirmCurrentConnectionName"
    @confirm="onConfirmConnectionExecution"
    @cancel="onCancelConnectionExecution"
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
            :workspaceId="route.params.workspaceId"
            :file-variables="fileVariables"
            :code-editor-layout="appConfigStore.codeEditorLayout"
            :currentFileInfo="currentFile"
            @update:update-file-variables="updateFileVariables"
          />
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
            :execute-errors="!!queryProcessState.executeErrors"
            :is-have-one-execute="queryProcessState.isHaveOneExecute"
            :is-streaming="queryProcessState.isStreaming"
            :streaming-row-count="queryProcessState.streamingRowCount"
            :queryTime="queryProcessState.queryTime"
            :raw-query-results-length="currentRawQueryResult.length"
            :explain-analyze-option-items="explainAnalyzeOptionItems"
            :serialize-mode="serializeMode"
            @on-format-current-statement="onHandleFormatCurrentStatement"
            @on-format-all="onHandleFormatCode"
            @on-explain-analyze-current="onExplainAnalyzeCurrent"
            @toggle-explain-option="rawQueryEditor.toggleExplainOption"
            @update:serialize-mode="rawQueryEditor.setSerializeMode"
            @on-execute-current="onExecuteCurrent"
            @on-cancel-query="rawQueryEditor.cancelStreamingQuery"
          />
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
          <VariableEditor
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
        @update:active-tab="rawQueryEditor.setActiveResultTab"
        @close-tab="rawQueryEditor.closeResultTab"
        @close-other-tabs="rawQueryEditor.closeOtherResultTabs"
        @close-tabs-to-right="rawQueryEditor.closeResultTabsToRight"
        @update:view="rawQueryEditor.updateResultTabView"
      />
    </template>
  </RawQueryLayout>
</template>
