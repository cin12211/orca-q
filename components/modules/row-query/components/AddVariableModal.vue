<script setup lang="ts">
import { Link } from '#components';
import { json, jsonParseLinter } from '@codemirror/lang-json';
import { linter, lintGutter } from '@codemirror/lint';
import { placeholder } from '@codemirror/view';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { shortCutFormatOnSave } from '~/components/base/code-editor/extensions';
import { jsonFormat } from '~/utils/common';

defineProps<{
  open: Boolean;
  fileVariables: string;
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
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

const updateFileContent = async (fileContentsValue: string) => {
  emit('updateVariables', fileContentsValue);
};
</script>

<template>
  <Dialog class="" :open="!!open" @update:open="emit('update:open', $event)">
    <DialogContent
      class="w-[60vw] h-[50vh] flex flex-col justify-between min-w-[60vw]"
    >
      <DialogHeader>
        <DialogTitle>
          Add Variable
          <a
            class="underline"
            href="https://www.w3schools.com/js/js_json_syntax.asp"
            target="_blank"
          >
            (JSON format)</a
          >
        </DialogTitle>
      </DialogHeader>

      <div class="h-full flex flex-col overflow-y-auto">
        <CodeEditor
          @update:modelValue="updateFileContent"
          @update:cursorInfo="cursorInfo = $event"
          :modelValue="fileVariables"
          :extensions="extensions"
          :disabled="false"
          ref="codeEditorRef"
        />
      </div>

      <DialogFooter class="mt-2">
        <Button @click="emit('update:open', false)"> Save </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
