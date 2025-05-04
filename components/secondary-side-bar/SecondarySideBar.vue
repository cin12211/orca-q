<script setup lang="ts">
import { CodeEditor } from '#components';
import { acceptCompletion, startCompletion } from '@codemirror/autocomplete';
import { json } from '@codemirror/lang-json';
import { keymap, lineNumberMarkers, lineNumbers } from '@codemirror/view';
import {
  type SyntaxTreeNodeData,
  shortCutExecuteCurrentStatement,
  shortCutFormatOnSave,
} from '~/components/base/code-editor/extensions';

// TODO: json editor
// https://www.npmjs.com/package/immutable-json-patch
// https://www.npmjs.com/package/json-beautify

definePageMeta({
  keepalive: true,
});

const code = ref('');

const extensions = [
  shortCutExecuteCurrentStatement(
    async (currentStatement: SyntaxTreeNodeData) => {
      console.log('🚀 ~ currentStatement:', currentStatement);
    }
  ),
  // shortCutFormatOnSave((fileContent: string) => {
  //   // const formatted = format(fileContent, {
  //   //   language: 'postgresql',
  //   //   keywordCase: 'upper',
  //   // });
  //   return fileContent;
  // }),

  keymap.of([
    { key: 'Mod-i', run: startCompletion },
    { key: 'Tab', run: acceptCompletion },
  ]),
  json(),
  lineNumbers(),
];
</script>

<template>
  <div class="w-full h-full">
    <div class="h-full">
      <CodeEditor v-model="code" :extensions="extensions" :disabled="false" />
    </div>
  </div>
</template>
