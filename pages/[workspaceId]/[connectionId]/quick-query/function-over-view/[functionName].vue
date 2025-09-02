<script setup lang="ts">
import {
  acceptCompletion,
  startCompletion,
  type Completion,
} from '@codemirror/autocomplete';
import { PostgreSQL, sql, type SQLNamespace } from '@codemirror/lang-sql';
import { Compartment } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { format } from 'sql-formatter';
import {
  type SyntaxTreeNodeData,
  shortCutExecuteCurrentStatement,
  shortCutFormatOnSave,
  // currentStatementHighlighter,
  sqlAutoCompletion,
} from '~/components/base/code-editor/extensions';
import { pgKeywordCompletion } from '~/components/base/code-editor/utils/pgKeywordCompletion';
import { useAppContext } from '~/shared/contexts/useAppContext';

definePageMeta({
  keepalive: true,
});

const route = useRoute(
  'workspaceId-connectionId-quick-query-function-over-view-functionName'
);

const { connectionStore, schemaStore, wsStateStore } = useAppContext();
const { activeSchema } = toRefs(schemaStore);
const { currentConnectionString } = toRefs(connectionStore);

const code = ref('');

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
      code.value = response.response._data || '';
    }
  },
});

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
      schema: mappedSchema.value,
    })
  ),
  //TODO: turn on when fix done bugs
  // currentStatementHighlighter,
  ...sqlAutoCompletion(),
];
</script>

<template>
  <div class="h-full relative">
    <LoadingOverlay :visible="status === 'pending'" />
    <BaseCodeEditor v-model="code" :extensions="extensions" :disabled="false" />
  </div>
</template>
