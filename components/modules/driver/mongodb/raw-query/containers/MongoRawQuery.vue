<script setup lang="ts">
import { LoadingOverlay } from '#components';
import BaseCodeEditor from '~/components/base/code-editor/BaseCodeEditor.vue';
import type { MongoDocument } from '~/components/modules/driver/mongodb/quick-query/types';
import { resolveCommandResultHandler } from '~/components/modules/driver/shared/raw-query';
import IntroRawQuery from '~/components/modules/raw-query/components/IntroRawQuery.vue';
import RawQueryConnectionConfirmDialog from '~/components/modules/raw-query/components/RawQueryConnectionConfirmDialog.vue';
import RawQueryEditorFooter from '~/components/modules/raw-query/components/RawQueryEditorFooter.vue';
import RawQueryEditorHeader from '~/components/modules/raw-query/components/RawQueryEditorHeader.vue';
import RawQueryLayout from '~/components/modules/raw-query/components/RawQueryLayout.vue';
import RawQueryResultTabs from '~/components/modules/raw-query/components/RawQueryResultTabs.vue';
import VariableEditor from '~/components/modules/raw-query/components/VariableEditor.vue';
import ResultTabErrorView from '~/components/modules/raw-query/components/result-tab/ResultTabErrorView.vue';
import ResultTabInfoView from '~/components/modules/raw-query/components/result-tab/ResultTabInfoView.vue';
import ResultTabRawView from '~/components/modules/raw-query/components/result-tab/ResultTabRawView.vue';
import {
  useRawQueryFileContentContext,
  useRawQueryResultTabsContext,
} from '~/components/modules/raw-query/hooks';
import { ViewMode } from '~/components/modules/raw-query/interfaces';
import { useHotkeys } from '~/core/composables/useHotKeys';
import { useEnvironmentTagStore } from '~/core/stores';
import { useAppConfigStore } from '~/core/stores/appConfigStore';
import { MONGODB_RAW_QUERY_CAPABILITIES } from '../capabilities';
import {
  MongoRawQueryApprovalDialog,
  MongoRawQueryConsole,
  MongoRawQueryResultView,
  MongoRawQueryVariableUsageGuidePopover,
} from '../components';
import {
  useMongoApproval,
  useMongoScriptEditorExtensions,
  useMongoScriptExecution,
  useMongoScriptMetadata,
} from '../hooks';
import { formatMongoScript } from '../utils';

// MongoDB has no query plan (Explain); Console carries its script log output.
const MONGO_SUPPORTED_VIEWS = [
  ViewMode.RESULT,
  ViewMode.RAW,
  ViewMode.INFO,
  ViewMode.CHART,
  ViewMode.CONSOLE,
  ViewMode.ERROR,
];

// Same capability flags the shared shell reads for SQL/Redis engines.
const isVariableSupported = MONGODB_RAW_QUERY_CAPABILITIES.supportsVariables;
const isFormatSupported = MONGODB_RAW_QUERY_CAPABILITIES.supportsFormat;

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
} = rawQueryFileContent;

const resultTabs = useRawQueryResultTabsContext();

const codeEditorRef = ref<InstanceType<typeof BaseCodeEditor> | null>(null);
const cursorInfo = ref({ line: 1, column: 1 });
const scrollTop = ref(0);
const showResultPanel = ref(true);

const metadataQuery = useMongoScriptMetadata({ connection });
const approval = useMongoApproval();

const isConnectionExecutionConfirmOpen = ref(false);
const executionConfirmTargetConnectionName = ref('');
const executionConfirmCurrentConnectionName = ref('');
let resolveConnectionExecutionConfirm: ((value: boolean) => void) | null = null;

const isCurrentConnectionStrictMode = computed(() => {
  if (!currentOpenedConnection.value) return false;
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

const mongoExecution = useMongoScriptExecution({
  connection,
  documentText: fileContents,
  fileVariables,
  resultTabs,
  beforeExecute: () => requestConnectionExecutionConfirm(),
});

const runScript = () => mongoExecution.execute();

const asMongoDocuments = (rows: Record<string, unknown>[]): MongoDocument[] =>
  rows as unknown as MongoDocument[];

const formatScript = async () => {
  const editorView = codeEditorRef.value?.editorView;
  if (!editorView) return;
  const formatted = await formatMongoScript(editorView.state.doc.toString());
  updateFileContent(formatted);
};

const editor = useMongoScriptEditorExtensions({
  codeEditorRef,
  fileVariables,
  databases: metadataQuery.databases,
  metadataByDatabase: metadataQuery.metadataByDatabase,
  ensureDatabaseMetadata: metadataQuery.ensureDatabaseMetadata,
  onExecuteCurrent: runScript,
  onFormat: formatScript,
});

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
  cursorInfo.value = { column, line };
  rawQueryFileContent.updateFileCursorPos({ from, to });
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

  <MongoRawQueryApprovalDialog
    :open="Boolean(approval.pendingApproval.value)"
    :loading="approval.isConfirming.value"
    :operations="approval.pendingApproval.value?.operations || []"
    @confirm="approval.confirmPendingWrite"
    @cancel="approval.cancelPendingWrite"
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
          />
          <div class="h-full flex flex-col overflow-y-auto">
            <LoadingOverlay v-if="isEditorLoading" visible />

            <BaseCodeEditor
              v-else
              @update:modelValue="updateFileContent"
              @update:cursorInfo="onUpdateCursorInfo"
              @update:onScrollTop="scrollTop = $event"
              :modelValue="fileContents"
              :extensions="editor.extensions"
              ref="codeEditorRef"
            />
          </div>

          <RawQueryEditorFooter
            :cursor-info="cursorInfo"
            :execute-loading="mongoExecution.queryProcessState.executeLoading"
            :is-streaming="mongoExecution.queryProcessState.isStreaming"
            :is-support-format="isFormatSupported"
            :is-support-variable="isVariableSupported"
            @on-format-current-statement="formatScript"
            @on-format-all="formatScript"
            @on-execute-current="runScript"
            @on-cancel-query="mongoExecution.cancel"
          >
            <template #usage-guide>
              <MongoRawQueryVariableUsageGuidePopover />
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
            desc="Variables are not available for MongoDB connections."
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
      <IntroRawQuery v-if="resultTabs.executedResults.value.size === 0" />

      <RawQueryResultTabs
        v-else
        :executed-results="resultTabs.executedResults.value"
        :active-tab-id="resultTabs.activeResultTabId.value"
        :execute-loading="mongoExecution.queryProcessState.executeLoading"
        :is-streaming="mongoExecution.queryProcessState.isStreaming"
        :resolve-command-result-handler="resolveCommandResultHandler"
        :supported-views="MONGO_SUPPORTED_VIEWS"
        @update:active-tab="resultTabs.setActiveResultTab"
        @close-tab="resultTabs.closeResultTab"
        @close-other-tabs="resultTabs.closeOtherResultTabs"
        @close-tabs-to-right="resultTabs.closeResultTabsToRight"
        @update:view="resultTabs.updateResultTabView"
      >
        <template #result-view="{ tab, view, formattedData }">
          <MongoRawQueryConsole
            v-if="view === ViewMode.CONSOLE"
            :logs="tab.metadata.logs"
          />
          <MongoRawQueryResultView
            v-else-if="view === ViewMode.RESULT"
            :documents="asMongoDocuments(tab.result)"
          />
          <ResultTabRawView
            v-else-if="view === ViewMode.RAW"
            :formatted-data="formattedData"
            :execute-loading="mongoExecution.queryProcessState.executeLoading"
            :is-streaming="mongoExecution.queryProcessState.isStreaming"
          />
          <ResultTabInfoView
            v-else-if="view === ViewMode.INFO"
            :active-tab="tab"
          />
          <ResultTabErrorView
            v-else-if="view === ViewMode.ERROR"
            :active-tab="tab"
            @onChangeView="resultTabs.updateResultTabView(tab.id, $event)"
          />
          <BaseEmpty
            v-else
            title="View not available"
            desc="This view is not available for MongoDB."
          />
        </template>
      </RawQueryResultTabs>
    </template>
  </RawQueryLayout>
</template>
