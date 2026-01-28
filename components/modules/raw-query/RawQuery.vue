<script setup lang="ts">
import BaseCodeEditor from '~/components/base/code-editor/BaseCodeEditor.vue';
import { useAppLayoutStore } from '~/shared/stores/appLayoutStore';
import IntroRawQuery from './components/IntroRawQuery.vue';
import RawQueryEditorFooter from './components/RawQueryEditorFooter.vue';
import RawQueryEditorHeader from './components/RawQueryEditorHeader.vue';
import RawQueryLayout from './components/RawQueryLayout.vue';
import RawQueryResultTabs from './components/RawQueryResultTabs.vue';
import VariableEditor from './components/VariableEditor.vue';
import { useRawQueryEditor, useRawQueryFileContent } from './hooks';

const route = useRoute('workspaceId-connectionId-explorer-fileId');
const appLayoutStore = useAppLayoutStore();
const rawQueryFileContent = useRawQueryFileContent();
const {
  connection,
  currentFile,
  fileContents,
  fileVariables,
  updateFileConnection,
  updateFileContent,
  updateFileVariables,
  connectionsByWsId,
  fieldDefs,
} = toRefs(rawQueryFileContent);

const rawQueryEditor = useRawQueryEditor({
  connection,
  fieldDefs,
  fileVariables,
});
const {
  cursorInfo,
  extensions,
  codeEditorRef,
  onExecuteCurrent,
  onHandleFormatCode,
  currentRawQueryResult,
  queryProcessState,
  // Results tab management
  executedResults,
  activeResultTabId,
} = toRefs(rawQueryEditor);

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

const isInitPos = ref(false);
const scrollTop = ref(0);

const onInitCursorPos = (allowScroll: boolean = true) => {
  if (!currentFile.value?.cursorPos || !codeEditorRef.value?.editorView) {
    return;
  }

  const from = currentFile?.value?.cursorPos?.from;
  0;
  const to = currentFile?.value?.cursorPos?.to || 0;

  isInitPos.value = true;
  codeEditorRef.value?.setCursorPosition({
    from,
    to,
    allowScroll,
  });
};

watch(
  [currentFile, codeEditorRef, isInitPos],
  async () => {
    if (isInitPos.value) return;

    await nextTick();

    setTimeout(() => {
      onInitCursorPos();
    }, 300);
  },
  {
    deep: true,
    immediate: true,
    flush: 'post',
  }
);

onActivated(async () => {
  if (isInitPos.value) {
    setTimeout(() => {
      onInitCursorPos(false);
      if (codeEditorRef.value && codeEditorRef.value.editorView) {
        codeEditorRef.value.editorView.scrollDOM.scrollTop = scrollTop.value;
      }
    }, 50);
  }
});
</script>

<template>
  <RawQueryLayout :layout="appLayoutStore.codeEditorLayout">
    <template #content>
      <div class="flex flex-col h-full p-1">
        <div class="flex flex-col h-full border rounded-md">
          <RawQueryEditorHeader
            @update:connectionId="updateFileConnection"
            :connections="connectionsByWsId"
            :connection="connection"
            :workspaceId="route.params.workspaceId"
            :file-variables="fileVariables"
            :code-editor-layout="appLayoutStore.codeEditorLayout"
            :currentFileInfo="currentFile"
            @update:update-file-variables="updateFileVariables"
          />
          <div class="h-full flex flex-col overflow-y-auto">
            <BaseCodeEditor
              @update:modelValue="updateFileContent"
              @update:cursorInfo="onUpdateCursorInfo"
              @update:onScrollTop="scrollTop = $event"
              :modelValue="fileContents"
              :extensions="extensions"
              :disabled="false"
              ref="codeEditorRef"
            />
          </div>

          <RawQueryEditorFooter
            :cursor-info="cursorInfo"
            :execute-loading="queryProcessState.executeLoading"
            :execute-errors="!!queryProcessState.executeErrors"
            :is-have-one-execute="queryProcessState.isHaveOneExecute"
            :queryTime="queryProcessState.queryTime"
            :raw-query-results-length="currentRawQueryResult.length"
            @onFormatCode="onHandleFormatCode"
            @on-execute-current="onExecuteCurrent"
          />
        </div>
      </div>
    </template>

    <template #variables>
      <div class="flex flex-col h-full border rounded-md bg-gray-50">
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
        @update:active-tab="rawQueryEditor.setActiveResultTab"
        @close-tab="rawQueryEditor.closeResultTab"
        @close-other-tabs="rawQueryEditor.closeOtherResultTabs"
        @close-tabs-to-right="rawQueryEditor.closeResultTabsToRight"
        @update:view="rawQueryEditor.updateResultTabView"
      />
    </template>
  </RawQueryLayout>
</template>
