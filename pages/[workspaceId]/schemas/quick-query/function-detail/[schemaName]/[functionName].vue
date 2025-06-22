<script setup lang="ts">
import { acceptCompletion, startCompletion } from '@codemirror/autocomplete';
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
  'workspaceId-schemas-quick-query-function-detail-schemaName-functionName'
);

const { connectionStore, schemaStore, wsStateStore } = useAppContext();
const { activeSchema } = toRefs(schemaStore);
const { currentConnectionString } = toRefs(connectionStore);

const code = ref('');

const schema: SQLNamespace = activeSchema.value?.tableDetails ?? {};

const sqlCompartment = new Compartment();

await useFetch('/api/get-one-function', {
  method: 'POST',
  body: {
    functionId: route.params.functionName,
    dbConnectionString: connectionStore.selectedConnection?.connectionString,
    schema: route.params.schemaName,
  },
  key: `${route.params.schemaName}-${route.params.functionName}`,
  onResponse: response => {
    code.value = response.response._data || '';
  },
  cache: 'force-cache',
});

const extensions = [
  shortCutExecuteCurrentStatement(
    async (currentStatement: SyntaxTreeNodeData) => {
      console.log(
        '🚀 ~ shortCutCurrentStatementExecute ~ currentStatement:',
        currentStatement,

        currentConnectionString.value,
        currentStatement.text
      );
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
  //TODO: turn on when fix done bugs
  // currentStatementHighlighter,
  ...sqlAutoCompletion(),
];
</script>

<template>
  <CodeEditor v-model="code" :extensions="extensions" :disabled="false" />
</template>
