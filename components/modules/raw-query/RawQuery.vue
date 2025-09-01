<script setup lang="ts">
import {
  acceptCompletion,
  startCompletion,
  type Completion,
} from '@codemirror/autocomplete';
import { PostgreSQL, sql, type SQLNamespace } from '@codemirror/lang-sql';
import { Compartment } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import merge from 'lodash-es/merge';
import type { FieldDef } from 'pg';
import CodeEditor from '~/components/base/code-editor/BaseCodeEditor.vue';
import BaseCodeEditor from '~/components/base/code-editor/BaseCodeEditor.vue';
import {
  currentStatementHighlighter,
  shortCutExecuteCurrentStatement,
  shortCutFormatOnSave,
  sqlAutoCompletion,
  type SyntaxTreeNodeData,
} from '~/components/base/code-editor/extensions';
import {
  getCurrentStatement,
  pgKeywordCompletion,
} from '~/components/base/code-editor/utils';
import { useAppContext } from '~/shared/contexts/useAppContext';
import { useExplorerFileStoreStore } from '~/shared/stores';
import { useAppLayoutStore } from '~/shared/stores/appLayoutStore';
import {
  convertParameters,
  type ParsedParametersResult,
} from '~/utils/common/convertParameters';
import RawQueryEditorFooter from './components/RawQueryEditorFooter.vue';
import RawQueryEditorHeader from './components/RawQueryEditorHeader.vue';
import RawQueryLayout from './components/RawQueryLayout.vue';
import VariableEditor from './components/VariableEditor.vue';
import type { EditorCursor, MappedRawColumn } from './interfaces';
import { formatColumnsInfo, formatStatementSql } from './utils';

//TODO: create lint check error for sql
// https://www.npmjs.com/package/node-sql-parser?activeTab=readme
// https://codemirror.net/examples/lint/

const route = useRoute('workspaceId-connectionId-explorer-fileId');
const appLayoutStore = useAppLayoutStore();
const explorerFileStore = useExplorerFileStoreStore();
const { schemaStore, tabViewStore, connectionStore } = useAppContext();
const { activeSchema } = toRefs(schemaStore);

const codeEditorRef = ref<InstanceType<typeof CodeEditor> | null>(null);
const fileContents = ref('');
const fileVariables = ref('');
const rawQueryResults = ref<unknown[][]>([]);
const fieldDefs = ref<FieldDef[]>([]);

const isHaveOneExecute = ref(false);
const cursorInfo = ref<EditorCursor>({ line: 1, column: 1 });
const executeLoading = ref(false);
const queryTime = ref(0); // ms
const executeErrors = ref<{
  message: string;
  data: Record<string, unknown>;
}>();
const currentStatementQuery = ref('');

const mappedSchema = computed(() => {
  const tableDetails = activeSchema.value?.tableDetails;

  const schema: SQLNamespace = {};

  for (const key in tableDetails) {
    const columns = tableDetails[key]?.columns;

    schema[key] = columns.map(col => {
      const sqlNamespace: Completion = {
        label: col.name,
        type: 'field',
        info: col.short_type_name || '',
        boost: -col.ordinal_position,
      };

      return sqlNamespace;
    });
  }

  return schema;
});

// const schema: SQLNamespace = activeSchema.value?.tableDetails ?? {};
const sqlCompartment = new Compartment();

const currentFile = computed(() =>
  explorerFileStore.getFileById(route.params.fileId as string)
);

const connectionsByWsId = computed(() => {
  return connectionStore.getConnectionsByWorkspaceId(
    route.params.workspaceId || ''
  );
});

const connection = computed(() => {
  return connectionsByWsId.value.find(
    connection => connection.id === currentFile.value?.connectionId
  );
});

const updateFileConnection = async (connectionId: string) => {
  if (!currentFile.value?.id) return;

  await explorerFileStore.updateFile({
    id: currentFile.value.id,
    connectionId,
  });
};

const updateFileContent = async (fileContentsValue: string) => {
  if (!currentFile.value?.id) return;

  fileContents.value = fileContentsValue;

  explorerFileStore.updateFileContent({
    contents: fileContentsValue,
    id: currentFile.value.id,
    variables: fileVariables.value || '',
  });
};

const updateFileVariables = async (fileVariablesValue: string) => {
  if (!currentFile.value?.id) return;

  fileVariables.value = fileVariablesValue;

  explorerFileStore.updateFileContent({
    contents: fileContents.value,
    id: currentFile.value.id,
    variables: fileVariablesValue,
  });
};

const executeCurrentStatement = async ({
  currentStatement,
  treeNodes,
}: {
  currentStatement: SyntaxTreeNodeData;
  treeNodes: SyntaxTreeNodeData[];
}) => {
  isHaveOneExecute.value = true;
  currentStatementQuery.value = currentStatement.text;

  let executeQuery = currentStatement.text;

  const currentStatementTrees: SyntaxTreeNodeData[] = [];

  treeNodes.forEach(item => {
    if (item.from >= currentStatement.from && item.to <= currentStatement.to) {
      currentStatementTrees.push(item);
    }
  });

  // console.log('currentStatementTrees:::', currentStatementTrees);

  const reversedCurrentStatementTrees = currentStatementTrees.toReversed();

  let parameters: ParsedParametersResult | null = null;

  for (var statement of reversedCurrentStatementTrees) {
    if (statement.type === 'LineComment') {
      const convertResult = convertParameters(statement.text);

      if (convertResult.values) {
        parameters = convertResult;
        break;
      }
    }
  }

  const fileParameters = convertParameters(fileVariables.value || '');

  let mergeParameters: Record<string, string> =
    (fileParameters.values as Record<string, string>) || {};

  if (parameters?.values) {
    mergeParameters = merge(mergeParameters, parameters.values || {});
  }

  const fillQueryWithParameters = formatStatementSql(
    currentStatement.text,
    mergeParameters
  );

  executeQuery = fillQueryWithParameters;

  executeLoading.value = true;
  try {
    const result = await $fetch('/api/raw-execute', {
      method: 'POST',
      body: {
        dbConnectionString: connection.value?.connectionString,
        query: executeQuery,
      },
    });

    rawQueryResults.value = result.rows as unknown[][];
    fieldDefs.value = result.fields;

    executeErrors.value = undefined;

    queryTime.value = result.queryTime || 0;
  } catch (e: any) {
    executeErrors.value = e.data;
  }

  executeLoading.value = false;
};

const extensions = [
  shortCutExecuteCurrentStatement(executeCurrentStatement),
  shortCutFormatOnSave((fileContent: string) => {
    return formatStatementSql(fileContent);
  }),

  keymap.of([
    { key: 'Mod-i', run: startCompletion },
    { key: 'Tab', run: acceptCompletion },
  ]),

  sqlCompartment.of(
    sql({
      dialect: PostgreSQL,
      upperCaseKeywords: true,
      keywordCompletion: pgKeywordCompletion,
      schema: mappedSchema.value,
    })
  ),
  currentStatementHighlighter,
  ...sqlAutoCompletion(),
];

onMounted(async () => {
  const { contents, variables } = await explorerFileStore.getFileContentById(
    route.params.fileId as string
  );

  fileContents.value = contents;
  fileVariables.value = variables;
});

const onExecuteCurrent = () => {
  if (!codeEditorRef.value?.editorView) {
    return;
  }

  const { currentStatement, treeNodes } = getCurrentStatement(
    codeEditorRef.value?.editorView as EditorView
  );

  if (currentStatement) {
    executeCurrentStatement({
      currentStatement,
      treeNodes,
    });
  }
};

const onHandleFormatCode = () => {
  if (!codeEditorRef.value?.editorView) {
    return;
  }

  const view = codeEditorRef.value?.editorView as EditorView;

  const code = view.state.doc.toString();

  if (code) {
    const formattedCode = formatStatementSql(code);

    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: formattedCode,
      },
    });
  }
};

const mappedColumns = computed<MappedRawColumn[]>(() => {
  return formatColumnsInfo({
    activeSchema: activeSchema.value,
    fieldDefs: fieldDefs.value,
    getTableInfoById: schemaStore.getTableInfoById,
  });
});

// watch(
//   () => route.params.fileId,
//   async fileId => {
//     const contents = await explorerFileStore.getFileContentById(
//       fileId as string
//     );

//     fileContents.value = contents;
//   }
// );
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
            :execute-loading="executeLoading"
            :execute-errors="!!executeErrors"
            :is-have-one-execute="isHaveOneExecute"
            :queryTime="queryTime"
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
      <div v-if="executeErrors" class="pt-2">
        <!-- <span class="font-normal text-xs text-muted-foreground block">
          Execute query:
          <span class="italic"> {{ currentStatementQuery }} </span>
        </span> -->

        <span class="font-normal text-sm text-muted-foreground block leading-5">
          Error message:
          <span class="decoration-wavy underline decoration-red-600">
            {{ executeErrors.message }}
          </span>
        </span>
        <span class="font-normal text-sm text-muted-foreground block">
          Errors detail: {{ executeErrors.data }}
        </span>
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
