<script setup lang="ts">
import { acceptCompletion, startCompletion } from '@codemirror/autocomplete';
import { PostgreSQL, type SQLNamespace, sql } from '@codemirror/lang-sql';
import { Compartment } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { format } from 'sql-formatter';
import CodeEditor from '~/components/base/code-editor/CodeEditor.vue';
import {
  type SyntaxTreeNodeData,
  currentStatementHighlighter,
  shortCutExecuteCurrentStatement,
  shortCutFormatOnSave,
  sqlAutoCompletion,
} from '~/components/base/code-editor/extensions';
import { pgKeywordCompletion } from '~/components/base/code-editor/utils';
import PureConnectionSelector from '~/components/modules/selectors/PureConnectionSelector.vue';
import { useAppContext } from '~/shared/contexts/useAppContext';
import { useExplorerFileStoreStore } from '~/shared/stores';

//TODO: create lint check error for sql
// https://www.npmjs.com/package/node-sql-parser?activeTab=readme
// https://codemirror.net/examples/lint/

definePageMeta({
  keepalive: false,
});

const route = useRoute('workspaceId-connectionId-explorer-fileId');

const { schemaStore, tabViewStore, connectionStore } = useAppContext();
const { activeSchema } = toRefs(schemaStore);

const explorerFileStore = useExplorerFileStoreStore();

const currentFile = computed(() =>
  explorerFileStore.getFileById(route.params.fileId as string)
);

const schema: SQLNamespace = activeSchema.value?.tableDetails ?? {};
console.log('🚀 ~ schema:', activeSchema.value?.tableDetails);

const fileContents = ref('');

const tableData = ref<Record<string, unknown>[]>([]);

const sqlCompartment = new Compartment();

const connectionsByWsId = computed(() => {
  return connectionStore.getConnectionsByWorkspaceId(
    currentFile.value?.workspaceId || ''
  );
});

const connection = computed(() => {
  return connectionsByWsId.value.find(
    connection => connection.id === currentFile.value?.connectionId
  );
});

const executeLoading = ref(false);
const queryTime = ref(0); // ms

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

  console.log('hello', fileContentsValue);
  explorerFileStore.updateFileContent({
    contents: fileContentsValue,
    id: currentFile.value.id,
  });
};

const extensions = [
  shortCutExecuteCurrentStatement(
    async (currentStatement: SyntaxTreeNodeData) => {
      console.log('currentStatement', connection.value?.connectionString);

      const startTime = Date.now();
      executeLoading.value = true;
      try {
        const result = await $fetch('/api/execute', {
          method: 'POST',
          body: {
            dbConnectionString: connection.value?.connectionString,
            query: currentStatement.text,
          },
        });

        console.log('result', result);

        tableData.value = result;
      } catch {}

      const endTime = Date.now();
      queryTime.value = endTime - startTime;
    }
  ),
  shortCutFormatOnSave((fileContent: string) => {
    const formatted = format(fileContent, {
      language: 'postgresql',
      keywordCase: 'upper',
    });
    return formatted;
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
      schema: schema,
    })
  ),
  currentStatementHighlighter,
  ...sqlAutoCompletion(),
];

onMounted(async () => {
  const contents = await explorerFileStore.getFileContentById(
    route.params.fileId as string
  );

  fileContents.value = contents;
});
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center justify-between bg-gray-50 p-1">
      <div>
        <Breadcrumb>
          <BreadcrumbList class="gap-0!">
            <BreadcrumbItem>
              <BreadcrumbLink> File </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
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

      <PureConnectionSelector
        :connectionId="currentFile?.connectionId || ''"
        @update:connectionId="updateFileConnection"
        :connections="connectionsByWsId"
        :connection="connection"
        class="w-16 h-6! px-1.5"
        :workspaceId="route.params.workspaceId"
      />
    </div>

    <div class="h-full">
      <CodeEditor
        @update:modelValue="updateFileContent"
        :modelValue="fileContents"
        :extensions="extensions"
        :disabled="false"
      />
    </div>
    <!-- {{ executeLoading }}-{{ queryTime }} -->
    <div class="h-[40rem] w-full">
      <DynamicTable :data="tableData" />
    </div>
  </div>
</template>
