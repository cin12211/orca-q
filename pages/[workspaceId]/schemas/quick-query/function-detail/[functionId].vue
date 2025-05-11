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
  'workspaceId-schemas-quick-query-function-detail-functionId'
);

const { connectionStore } = useAppContext();

const code = ref('');

const { currentConnectionString } = useAppContext();

const { schemaStore } = useAppContext();

const schema: SQLNamespace = schemaStore.currentSchema?.tableDetails ?? {};

const sqlCompartment = new Compartment();

//TODO: must create specific function for get function definition
await useFetch('/api/execute', {
  method: 'POST',
  body: {
    query: `SELECT pg_get_functiondef('${route.params.functionId}'::regproc) as def;`,
    dbConnectionString: connectionStore.selectedConnection?.connectionString,
  },
  key: route.params.functionId,
  onResponse: response => {
    if (response.response._data?.[0]?.def) {
      code.value = response.response._data?.[0]?.def;
    }
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
