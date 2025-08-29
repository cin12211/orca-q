<script setup lang="ts">
import { Button } from '#components';
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
import CodeEditor from '~/components/base/code-editor/CodeEditor.vue';
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
import PureConnectionSelector from '~/components/modules/selectors/PureConnectionSelector.vue';
import type {
  ColumnShortMetadata,
  TableDetailMetadata,
} from '~/server/api/get-schema-meta-data';
import { useAppContext } from '~/shared/contexts/useAppContext';
import { useExplorerFileStoreStore } from '~/shared/stores';
import { useAppLayoutStore } from '~/shared/stores/appLayoutStore';
import {
  convertParameters,
  type ParsedParametersResult,
} from '~/utils/common/convertParameters';
import { formatQueryTime } from '~/utils/common/format';
import AddVariableModal from './components/AddVariableModal.vue';
import type { MappedRawColumn } from './interfaces';
import { formatStatementSql, formatColumnsInfo } from './utils';

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
const cursorInfo = ref({ line: 1, column: 1 });
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

const openBottomPanelIfNeed = () => {
  if (appLayoutStore.bodySize[1] === 0) {
    appLayoutStore.onToggleBottomPanel();
  }
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

  openBottomPanelIfNeed();
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

const isActiveTeleport = ref(true);

onActivated(() => {
  isActiveTeleport.value = true;
});

onDeactivated(() => {
  isActiveTeleport.value = false;
});

const isOpenAddVariableModal = ref(false);
const isVariableError = ref(false);

const openAddVariableModal = () => {
  isOpenAddVariableModal.value = true;
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
  <AddVariableModal
    @updateVariables="updateFileVariables"
    :file-variables="fileVariables"
    v-model:open="isOpenAddVariableModal"
  />
  <div class="flex flex-col h-full">
    <div class="flex items-center justify-between p-1 border-b shadow">
      <div>
        <Breadcrumb>
          <BreadcrumbList class="gap-0!">
            <!-- <BreadcrumbItem>
              <BreadcrumbLink> File </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator /> -->
            <BreadcrumbItem>
              <BreadcrumbLink class="flex items-center gap-0.5">
                <Icon :name="tabViewStore.activeTab?.icon" />
                {{ tabViewStore.activeTab?.name }}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <!-- <BreadcrumbSeparator /> -->
            <!-- <BreadcrumbItem>
          <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
        </BreadcrumbItem> -->
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div class="flex gap-2 items-center">
        <Button
          @click="openAddVariableModal"
          variant="outline"
          size="sm"
          class="h-6 px-2 gap-1 font-normal relative"
        >
          <Icon
            name="lucide:triangle-alert"
            class="absolute -top-1 -right-1 text-red-400"
            v-if="isVariableError"
          />
          <Icon name="hugeicons:absolute" /> Add variables
        </Button>
        <PureConnectionSelector
          :connectionId="currentFile?.connectionId || ''"
          @update:connectionId="updateFileConnection"
          :connections="connectionsByWsId"
          :connection="connection"
          class="w-16 h-6! px-1.5"
          :workspaceId="route.params.workspaceId"
        />

        <Button @click="openAddVariableModal" variant="outline" size="iconSm">
          <Icon name="hugeicons:settings-01" />
        </Button>
      </div>
    </div>

    <div class="h-full flex flex-col overflow-y-auto">
      <CodeEditor
        @update:modelValue="updateFileContent"
        @update:cursorInfo="cursorInfo = $event"
        :modelValue="fileContents"
        :extensions="extensions"
        :disabled="false"
        ref="codeEditorRef"
      />
    </div>

    <div class="h-9 flex items-center justify-between px-2">
      <div class="font-normal text-xs text-muted-foreground">
        Ln {{ cursorInfo.line }}, Col {{ cursorInfo.column }}
      </div>

      <div
        v-if="isHaveOneExecute"
        class="font-normal text-xs text-muted-foreground"
      >
        <span v-if="executeLoading" class="flex items-center gap-1"
          >Processing

          <Icon name="hugeicons:loading-03" class="size-4! animate-spin">
          </Icon>
        </span>
        <span v-else>
          <span v-if="executeErrors">
            Query: 1 error in {{ formatQueryTime(queryTime) }}
          </span>
          <span v-else>
            Query: {{ rawQueryResults.length }} rows in
            {{ formatQueryTime(queryTime) }}
          </span>
        </span>
      </div>

      <div class="flex gap-1">
        <Button
          @click="onHandleFormatCode"
          variant="outline"
          size="sm"
          class="h-6 px-2 gap-1 font-normal"
        >
          <Icon name="hugeicons:magic-wand-01"> </Icon>
          Format code
        </Button>

        <Button
          @click="onExecuteCurrent"
          variant="outline"
          size="sm"
          class="h-6 px-2 gap-1 font-normal"
        >
          <Icon name="hugeicons:play"> </Icon>
          Execute current
        </Button>
      </div>
    </div>

    <!-- TODO: can support execute result for many table -->
    <Teleport defer to="#bottom-panel" v-if="isActiveTeleport">
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
        class="h-full py-2"
      />
    </Teleport>
  </div>
</template>
