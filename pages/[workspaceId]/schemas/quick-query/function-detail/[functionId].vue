<script setup lang="ts">
import { format } from 'sql-formatter';
import {
  type SyntaxTreeNodeData,
  shortCutExecuteCurrentStatement,
  shortCutFormatOnSave,
} from '~/components/base/code-editor/extensions';
import { useAppContext } from '~/shared/contexts/useAppContext';

definePageMeta({
  keepalive: true,
});

const route = useRoute(
  'workspaceId-schemas-quick-query-function-detail-functionId'
);

const { connectionStore } = useAppContext();

const code = ref('');

//TODO: must create specific function for get function definition
await useFetch('/api/execute', {
  method: 'POST',
  body: {
    query: `SELECT pg_get_functiondef('${route.params.functionId}'::regproc) as def;`,
    connectionUrl: connectionStore.selectedConnection?.connectionString,
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
  shortCutExecuteCurrentStatement((currentStatement: SyntaxTreeNodeData) => {
    console.log(
      '🚀 ~ shortCutCurrentStatementExecute ~ currentStatement:',
      currentStatement
    );
  }),
  shortCutFormatOnSave((fileContent: string) => {
    const formatted = format(fileContent, {
      language: 'postgresql',
    });

    return formatted;
  }),
];
</script>

<template>
  <CodeEditor v-model="code" :extensions="extensions" :disabled="false" />
</template>
