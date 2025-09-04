<script setup lang="ts">
import BaseCodeEditor from '~/components/base/code-editor/BaseCodeEditor.vue';
import { useAppLayoutStore } from '~/shared/stores/appLayoutStore';
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
  rawQueryResults,
  queryProcessState,
  // sqlCompartment,
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
            :connectionId="currentFile?.connectionId || ''"
            :file-variables="fileVariables"
            :code-editor-layout="appLayoutStore.codeEditorLayout"
            @update:update-file-variables="updateFileVariables"
          />
          <div class="h-full flex flex-col overflow-y-auto">
            <BaseCodeEditor
              @update:modelValue="updateFileContent"
              @update:cursorInfo="cursorInfo = $event"
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
            :raw-query-results-length="rawQueryResults.length"
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
        v-else-if="!rawQueryResults.length"
        class="text-center font-normal text-xs text-muted-foreground mt-4"
      >
        No row found
      </div>

      <DynamicTable
        v-else
        :columns="mappedColumns"
        :data="rawQueryResults || []"
        class="h-full"
      />
    </template>
  </RawQueryLayout>
</template>
