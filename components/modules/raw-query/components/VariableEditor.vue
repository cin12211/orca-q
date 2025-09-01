<script setup lang="ts">
import { json, jsonParseLinter } from '@codemirror/lang-json';
import { linter, lintGutter } from '@codemirror/lint';
import { placeholder } from '@codemirror/view';
import { _debounce } from 'ag-grid-community';
import BaseCodeEditor from '~/components/base/code-editor/BaseCodeEditor.vue';
import { shortCutFormatOnSave } from '~/components/base/code-editor/extensions';
import { jsonFormat } from '~/utils/common';
import { DEFAULT_DEBOUNCE_INPUT } from '~/utils/constants';

const props = defineProps<{
  fileVariables: string;
}>();

const emit = defineEmits<{
  (e: 'updateVariables', value: string): void;
}>();

const cursorInfo = ref({ line: 1, column: 1 });

const extensions = [
  placeholder(`Please input your json variable 
{
  "key": "value"
}`),
  //   shortCutExecuteCurrentStatement(executeCurrentStatement),
  shortCutFormatOnSave((fileContent: string) => {
    try {
      const formatted = jsonFormat(fileContent, {
        type: 'space',
        size: 2,
      });

      return formatted;
    } catch (error) {
      return fileContent;
    }
  }),
  json(),
  lintGutter(), // show gutter for linter warnings
  linter(jsonParseLinter()), // attach JSON linter
];

const updateFileContent = _debounce(
  {
    isAlive: () => true,
  },
  (fileContentsValue: string) => {
    emit('updateVariables', fileContentsValue);
  },
  DEFAULT_DEBOUNCE_INPUT
);
</script>

<template>
  <BaseCodeEditor
    @update:modelValue="updateFileContent"
    @update:cursorInfo="cursorInfo = $event"
    :modelValue="fileVariables"
    :extensions="extensions"
    :disabled="false"
    ref="codeEditorRef"
  />
</template>
