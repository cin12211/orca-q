<script setup lang="ts">
import { acceptCompletion, startCompletion } from '@codemirror/autocomplete';
import { PostgreSQL, type SQLNamespace, sql } from '@codemirror/lang-sql';
import { Compartment } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { format } from 'sql-formatter';
import {
  type SyntaxTreeNodeData,
  shortCutExecuteCurrentStatement,
  shortCutFormatOnSave,
  currentStatementHighlighter,
  sqlAutoCompletion,
} from '~/components/base/code-editor/extensions';
import { pgKeywordCompletion } from '~/components/base/code-editor/utils';
import { useAppContext } from '~/shared/contexts/useAppContext';

definePageMeta({
  keepalive: true,
});

const { schemaStore } = useAppContext();

const schema: SQLNamespace = schemaStore.currentSchema?.tableDetails ?? {};

const code = ref('');

const tableData = ref<Record<string, unknown>[]>([]);

const sqlCompartment = new Compartment();

const { currentConnectionString } = useAppContext();

const extensions = [
  shortCutExecuteCurrentStatement(
    async (currentStatement: SyntaxTreeNodeData) => {
      console.log(
        '🚀 ~ shortCutCurrentStatementExecute ~ currentStatement:',
        currentStatement,

        currentConnectionString.value,
        currentStatement.text
      );

      const result = await $fetch('/api/execute', {
        method: 'POST',
        body: {
          connectionUrl: currentConnectionString.value,
          query: currentStatement.text,
        },
      });

      console.log('result', result);

      tableData.value = result;
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
</script>

<template>
  <div class="flex flex-col gap-2 h-full">
    <div class="h-full">
      <CodeEditor v-model="code" :extensions="extensions" :disabled="false" />
    </div>

    <div class="h-[40rem] w-full">
      <DynamicTable :data="tableData" />
    </div>
  </div>
</template>
