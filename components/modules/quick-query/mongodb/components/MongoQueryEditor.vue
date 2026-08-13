<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import type { Extension } from '@codemirror/state';
import { placeholder as placeholderExtension } from '@codemirror/view';
import BaseCodeEditor from '~/components/base/code-editor/BaseCodeEditor.vue';
import {
  mongoExecuteKeymap,
  mongoQuery,
} from '~/components/base/code-editor/extensions/mongoQueryLanguage';

const props = withDefaults(
  defineProps<{
    modelValue: string;
    placeholder?: string;
    maxHeight?: string;
    fields?: string[];
  }>(),
  {
    maxHeight: '200px',
    fields: () => [],
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'execute'): void;
}>();

const editorRef =
  useTemplateRef<InstanceType<typeof BaseCodeEditor>>('editorRef');

const extensions = computed(() => {
  const exts: Extension[] = [
    ...mongoQuery(() => props.fields || []),
    mongoExecuteKeymap(() => emit('execute')),
  ];
  if (props.placeholder) {
    exts.push(placeholderExtension(props.placeholder));
  }
  return exts;
});

function focus() {
  editorRef.value?.focus();
}

defineExpose({
  focus,
});
</script>

<template>
  <BaseCodeEditor
    ref="editorRef"
    :model-value="modelValue"
    :extensions="extensions"
    class="mongo-query-editor"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>

<style scoped>
.mongo-query-editor :deep(.cm-editor) {
  height: auto;
  min-height: 60px;
  max-height: v-bind('props.maxHeight');
  border: 1px solid var(--input);
  border-radius: var(--radius);
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

.mongo-query-editor :deep(.cm-editor.cm-focused) {
  outline: none;
  border-color: var(--ring, var(--primary));
  box-shadow: 0 0 0 2px
    color-mix(in srgb, var(--ring, var(--primary)) 25%, transparent);
}

.mongo-query-editor :deep(.cm-scroller) {
  overflow: auto;
}
</style>
