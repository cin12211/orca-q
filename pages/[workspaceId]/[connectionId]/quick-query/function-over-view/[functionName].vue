<script setup lang="ts">
import {
  acceptCompletion,
  startCompletion,
  type Completion,
} from '@codemirror/autocomplete';
import {
  SQLDialect,
  sql,
  type SQLNamespace,
  PostgreSQL,
} from '@codemirror/lang-sql';
import { Compartment } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { format } from 'sql-formatter';
import { toast } from 'vue-sonner';
import BaseCodeEditor from '~/components/base/code-editor/BaseCodeEditor.vue';
import {
  shortCutSaveFunction,
  shortCutFormatOnSave,
  sqlAutoCompletion,
  currentStatementLineGutterExtension,
} from '~/components/base/code-editor/extensions';
import { pgKeywordCompletion } from '~/components/base/code-editor/utils/pgKeywordCompletion';
import QuickQueryErrorPopup from '~/components/modules/quick-query/QuickQueryErrorPopup.vue';
import FunctionControlBar from '~/components/modules/quick-query/function-control-bar/FunctionControlBar.vue';
import { useAppContext } from '~/shared/contexts/useAppContext';
import { useQuickQueryLogs } from '~/shared/stores';

definePageMeta({
  keepalive: true,
});

const route = useRoute(
  'workspaceId-connectionId-quick-query-function-over-view-functionName'
);

const { connectionStore, schemaStore } = useAppContext();
const { activeSchema } = toRefs(schemaStore);
const qqLogStore = useQuickQueryLogs();

const code = ref('');
const originalCode = ref('');
const isSaving = ref(false);
const errorMessage = ref('');
const openErrorModal = ref(false);

const hasChanges = computed(() => code.value !== originalCode.value);

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

const sqlCompartment = new Compartment();

const { status } = useFetch('/api/get-one-function', {
  method: 'POST',
  body: {
    functionId: route.params.functionName,
    dbConnectionString: connectionStore.selectedConnection?.connectionString,
  },
  onResponse: response => {
    if (typeof response.response._data === 'string') {
      const fetchedCode = response.response._data || '';
      code.value = fetchedCode;
      originalCode.value = fetchedCode;
    }
  },
});

const saveFunction = async () => {
  if (!hasChanges.value || isSaving.value) return;

  isSaving.value = true;

  try {
    await $fetch('/api/update-function', {
      method: 'POST',
      body: {
        dbConnectionString:
          connectionStore.selectedConnection?.connectionString,
        functionDefinition: code.value,
      },
      onResponseError: error => {
        openErrorModal.value = true;
        errorMessage.value = error.response?._data?.message || '';
      },
      onResponse: response => {
        if (response.response.ok) {
          originalCode.value = code.value;
          toast.success('Function saved', {
            description: `Updated successfully in ${response.response._data?.queryTime}ms`,
          });
        }
      },
    });
  } finally {
    isSaving.value = false;
  }
};

const discardChanges = () => {
  code.value = originalCode.value;
};

const extensions = [
  // shortCutExecuteCurrentStatement(
  //   async (currentStatement: SyntaxTreeNodeData) => {
  //     console.log(
  //       '🚀 ~ shortCutCurrentStatementExecute ~ currentStatement:',
  //       currentStatement,

  //       currentConnectionString.value,
  //       currentStatement.text
  //     );
  //   }
  // ),
  shortCutSaveFunction(saveFunction),
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
      dialect: SQLDialect.define({
        ...PostgreSQL.spec,
        doubleDollarQuotedStrings: false,
      }),
      upperCaseKeywords: true,
      keywordCompletion: pgKeywordCompletion,
      schema: mappedSchema.value,
    })
  ),
  //TODO: turn on when fix done bugs
  // currentStatementHighlighter,
  ...sqlAutoCompletion(),
  currentStatementLineGutterExtension,
];
</script>

<template>
  <QuickQueryErrorPopup v-model:open="openErrorModal" :message="errorMessage" />

  <div class="flex flex-col h-full p-1">
    <div class="flex flex-col h-full border rounded-md">
      <FunctionControlBar
        :has-changes="hasChanges"
        :is-saving="isSaving"
        @on-save="saveFunction"
        @on-discard="discardChanges"
      />
      <div class="h-full flex flex-col overflow-y-auto relative">
        <LoadingOverlay :visible="status === 'pending' || isSaving" />
        <BaseCodeEditor
          v-model="code"
          :extensions="extensions"
          :disabled="false"
        />
      </div>
    </div>
  </div>
</template>
