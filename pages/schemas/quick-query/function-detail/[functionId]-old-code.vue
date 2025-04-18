<script setup lang="ts">
import { autocompletion } from '@codemirror/autocomplete';
import { sql, PostgreSQL, schemaCompletionSource } from '@codemirror/lang-sql';
import sqlFormatter from '@sqltools/formatter';
import { EditorView, basicSetup } from 'codemirror';

definePageMeta({
  keepalive: true,
});

const route = useRoute('schemas-quick-query-function-detail-functionId');

const code = ref('');

await useFetch('/api/execute', {
  method: 'POST',
  body: {
    query: `SELECT pg_get_functiondef('${route.params.functionId}'::regproc) as def;`,
  },
  key: route.params.functionId,
  onResponse: response => {
    console.log('response.response._data?.result[0]');

    code.value = response.response._data?.result?.[0]?.def;
  },
  cache: 'force-cache',
});

// Reference to the DOM element for CodeMirror
const editorRef = ref<HTMLElement | null>(null);
let editorView: EditorView | null = null;

// this will be load in by the server with this format
const schema = {
  users: ['id', 'name', 'age', 'email', 'created_at'],
  orders: ['order_id', 'user_id', 'product', 'amount', 'order_date'],
};

// Initialize CodeMirror on mount
onMounted(() => {
  if (editorRef.value) {
    editorView = new EditorView({
      doc: code.value, // Initial content
      extensions: [
        basicSetup,
        sql({
          dialect: PostgreSQL,
          upperCaseKeywords: true,
          schema,
        }),

        EditorView.updateListener.of(update => {
          if (update.docChanged) {
            code.value = update.state.doc.toString();
          }
        }),
      ],
      parent: editorRef.value,
    });
  }
});

onUnmounted(() => {
  if (editorView) {
    editorView.destroy();
  }
});
</script>

<template>
  <div class="h-full [&>.cm-editor]:h-full" ref="editorRef"></div>
</template>
