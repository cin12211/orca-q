<script setup lang="ts">
import {
  type SyntaxTreeNodeData,
  shortCutCurrentStatementExecute,
} from "~/components/base/code-editor/extensions";

definePageMeta({
  keepalive: true,
});

const route = useRoute(
  "activity-schemas-quick-query-function-detail-functionId"
);

const code = ref("");

await useFetch("/api/execute", {
  method: "POST",
  body: {
    query: `SELECT pg_get_functiondef('${route.params.functionId}'::regproc) as def;`,
  },
  key: route.params.functionId,
  onResponse: (response) => {
    code.value = response.response._data?.result?.[0]?.def;
  },
  cache: "force-cache",
});

const extensions = [
  shortCutCurrentStatementExecute((currentStatement: SyntaxTreeNodeData) => {
    console.log(
      "🚀 ~ shortCutCurrentStatementExecute ~ currentStatement:",
      currentStatement
    );
  }),
];
</script>

<template>
  <CodeEditor v-model="code" :extensions="extensions" :disabled="false" />
</template>
