<script setup lang="ts">
import { format } from 'sql-formatter';
import {
  type SyntaxTreeNodeData,
  shortCutExecuteCurrentStatement,
  shortCutFormatOnSave,
} from '~/components/base/code-editor/extensions';

definePageMeta({
  keepalive: true,
});

const route = useRoute(
  'workspaceId-schemas-quick-query-function-detail-functionId'
);

const code = ref('');

await useFetch('/api/execute', {
  method: 'POST',
  body: {
    query: `SELECT pg_get_functiondef('${route.params.functionId}'::regproc) as def;`,
  },
  key: route.params.functionId,
  onResponse: response => {
    code.value = response.response._data?.result?.[0]?.def;
  },
  cache: 'force-cache',
});

const extensions = [
  shortCutExecuteCurrentStatement((currentStatement: SyntaxTreeNodeData) => {
    console.log(
      '🚀 ~ shortCutCurrentStatementExecute ~ currentStatement:',
      currentStatement
    );
  }),
  shortCutFormatOnSave((fileContent: string) => {
    const formatted = format(fileContent, {
      language: 'mysql',
    });

    return formatted;
  }),
];
</script>

<template>
  <CodeEditor v-model="code" :extensions="extensions" :disabled="false" />
</template>
