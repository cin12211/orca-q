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

const route = useRoute('workspaceId-explorer-fileId');

const code = ref('');

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
      keywordCase: 'upper',
    });

    return formatted;
  }),
];
</script>

<template>
  <CodeEditor v-model="code" :extensions="extensions" :disabled="false" />
</template>
