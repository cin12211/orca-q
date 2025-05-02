<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { PostgreSQL, type SQLConfig, sql } from '@codemirror/lang-sql';
import { search } from '@codemirror/search';
import { Compartment, EditorState, type Extension } from '@codemirror/state';
import { EditorView, basicSetup } from 'codemirror';
import { ayuLight } from 'thememirror';
import { cn } from '@/lib/utils';
import { currentStatementLineGutter } from './extensions';

// Define props
interface Props {
  modelValue?: string; // For v-model binding
  disabled?: boolean; // Read-only mode
  config?: Partial<SQLConfig>; // SQL dialect and config
  extensions?: Extension[]; // Additional CodeMirror extensions
  class?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  disabled: false,
  config: () => ({ dialect: PostgreSQL, upperCaseKeywords: true }),
  extensions: () => [],
  class: '',
});

// Define emits
const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

// Reactive code state
const code = ref(props.modelValue);
const editorRef = ref<HTMLElement | null>(null);
let editorView: EditorView | null = null;

// Watch for external changes to modelValue
watch(
  () => props.modelValue,
  newValue => {
    if (newValue !== code.value && editorView) {
      code.value = newValue;
      editorView.dispatch({
        changes: {
          from: 0,
          to: editorView.state.doc.length,
          insert: newValue,
        },
      });
    }
  }
);

// Initialize editor on mount
onMounted(() => {
  if (editorRef.value) {
    // setting line wrapping
    const compartment = new Compartment();
    const isLineWrapping = true;
    const compartmentOfLineWrapping = compartment.of(
      isLineWrapping ? [EditorView.lineWrapping] : []
    );

    // setting read-only mode
    const readOnlyState = props.disabled ? EditorState.readOnly.of(true) : [];

    const state = EditorState.create({
      doc: code.value,
      extensions: [
        ...(props.extensions || []),
        basicSetup,
        search({
          top: true,
        }),
        // sql(props.config),
        EditorView.updateListener.of(update => {
          if (update.docChanged) {
            const newCode = update.state.doc.toString();
            code.value = newCode;
            emit('update:modelValue', newCode);
          }
        }),
        currentStatementLineGutter,
        readOnlyState,
        compartmentOfLineWrapping,
        ayuLight,
      ],
    });

    editorView = new EditorView({
      state,
      parent: editorRef.value,
    });
  }
});

// Clean up on unmount
onUnmounted(() => {
  if (editorView) {
    editorView.destroy();
    editorView = null;
  }
});

// Expose methods for programmatic control
defineExpose({
  code,
  editorView,
  focus: () => editorView?.focus(),
  setContent: (content: string) => {
    if (editorView) {
      editorView.dispatch({
        changes: {
          from: 0,
          to: editorView.state.doc.length,
          insert: content,
        },
      });
      code.value = content;
      emit('update:modelValue', content);
    }
  },
});
</script>

<template>
  <div
    :class="cn('h-full [&>.cm-editor]:h-full w-full', props.class)"
    ref="editorRef"
  ></div>
</template>

<style>
@import url('./extensions/extentions.css');
</style>
