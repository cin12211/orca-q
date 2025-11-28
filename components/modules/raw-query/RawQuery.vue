<script setup lang="ts">
import { useElementSize } from '@vueuse/core';
import VueJsonPretty from 'vue-json-pretty';
import 'vue-json-pretty/lib/styles.css';
import BaseCodeEditor from '~/components/base/code-editor/BaseCodeEditor.vue';
import { useAppLayoutStore } from '~/shared/stores/appLayoutStore';
import IntroRawQuery from './components/IntroRawQuery.vue';
import RawQueryEditorFooter from './components/RawQueryEditorFooter.vue';
import RawQueryEditorHeader from './components/RawQueryEditorHeader.vue';
import RawQueryLayout from './components/RawQueryLayout.vue';
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
  mappedColumns,
  updateFileConnection,
  updateFileContent,
  updateFileVariables,
  connectionsByWsId,
  activeSchema,
  fieldDefs,
} = toRefs(rawQueryFileContent);

const rawQueryEditor = useRawQueryEditor({
  activeSchema,
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
  rawResponse,
  // sqlCompartment,
  // executedResults,
} = toRefs(rawQueryEditor);

watch(
  () => [activeSchema.value?.tableDetails],
  () => {
    if (!activeSchema.value?.tableDetails) return;
    rawQueryEditor.reloadSqlCompartment();
  },
  {
    deep: true,
    immediate: true,
  }
);

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

const jsonViewRef = useTemplateRef('jsonViewRef');
const { height } = useElementSize(jsonViewRef);

const isRawViewMode = ref(false);
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
            :isRawViewMode="isRawViewMode"
            @update:isRawViewMode="isRawViewMode = $event"
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
      <LoadingOverlay v-if="queryProcessState.executeLoading" visible />
      <IntroRawQuery v-if="!queryProcessState.isHaveOneExecute" />

      <!-- <Tabs class="flex-1 mb-1 flex-wrap h-fit! w-full">
        <TabsList class="overflow-x-auto w-full justify-start!">
          <TabsTrigger
            class="cursor-pointer font-normal! flex-none!"
            v-for="(tab, index) in executedResults"
            :value="tab.id"
            :key="tab.id"
          >
            {{ tab.metadata.statementQuery.slice(0, 20) }} ({{ index }})

            <div class="hover:bg-accent p-0.5 rounded-full">
              <X class="size-3 stroke-[2.5]!" />
            </div>
          </TabsTrigger>
        </TabsList>
      </Tabs> -->

      <div v-if="queryProcessState.executeErrors" class="pt-2">
        <span class="font-normal text-sm text-muted-foreground block leading-5">
          Error message:
          <span class="decoration-wavy underline decoration-red-600">
            {{ queryProcessState.executeErrors.message }}
          </span>
        </span>
        <span class="font-normal text-sm text-muted-foreground block">
          Errors detail: {{ queryProcessState.executeErrors.data }}
        </span>

        <Collapsible>
          <CollapsibleTrigger>
            <span
              class="font-normal text-sm text-muted-foreground block flex items-center gap-1 cursor-pointer"
            >
              Execute query
              <Icon name="hugeicons:arrow-down-01" class="size-4!" />
            </span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <span class="font-normal text-sm text-muted-foreground block">
              {{ queryProcessState.currentStatementQuery }}
            </span>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <div
        ref="jsonViewRef"
        class="h-full flex flex-col flex-1 overflow-y-auto"
        v-show="
          !queryProcessState.executeErrors &&
          queryProcessState.isHaveOneExecute &&
          isRawViewMode
        "
      >
        <VueJsonPretty
          virtual
          showLineNumber
          showIcon
          showLength
          :height="height"
          :data="rawResponse"
        />
      </div>

      <DynamicTable
        v-show="
          !queryProcessState.executeErrors &&
          queryProcessState.isHaveOneExecute &&
          !isRawViewMode
        "
        :columns="mappedColumns"
        :data="currentRawQueryResult || []"
        class="h-full border rounded-md"
        skip-re-column-size
        columnKeyBy="index"
      />
    </template>
  </RawQueryLayout>
</template>
