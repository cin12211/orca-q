<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { PostgreSQL, type SQLConfig, sql } from '@codemirror/lang-sql';
import { syntaxTree } from '@codemirror/language';
import { linter, type Diagnostic } from '@codemirror/lint';
import { search } from '@codemirror/search';
import { Compartment, EditorState, type Extension } from '@codemirror/state';
import { showMinimap } from '@replit/codemirror-minimap';
// import { indentationMarkers } from '@replit/codemirror-indentation-markers';
import { EditorView, basicSetup } from 'codemirror';
import { tomorrow } from 'thememirror';
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
  (
    e: 'update:cursorInfo',
    value: {
      line: number;
      column: number;
    }
  ): void;
}>();

// Reactive code state
const code = ref(props.modelValue);
const editorRef = ref<HTMLElement | null>(null);

let editorView = ref<EditorView | null>(null);

// Watch for external changes to modelValue
watch(
  () => props.modelValue,
  newValue => {
    if (newValue !== code.value && editorView.value) {
      code.value = newValue;
      editorView.value.dispatch({
        changes: {
          from: 0,
          to: editorView.value.state.doc.length,
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

    //TODO: make lint for sql
    // const regexpLinter = linter(view => {
    //   let diagnostics: Diagnostic[] = [];
    //   syntaxTree(view.state)
    //     .cursor()
    //     .iterate(node => {
    //       console.log('🚀 ~ onMounted ~ node:', node.name);
    //       if (node.name == 'Identifier')
    //         diagnostics.push({
    //           from: node.from,
    //           to: node.to,
    //           severity: 'error',
    //           message: 'Regular expressions are FORBIDDEN',
    //           actions: [
    //             {
    //               name: 'Remove',
    //               apply(view, from, to) {
    //                 view.dispatch({ changes: { from, to } });
    //               },
    //             },
    //           ],
    //         });
    //     });
    //   return diagnostics;
    // });

    let create = (v: EditorView) => {
      const dom = document.createElement('div');
      return { dom };
    };

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

          if (update.selectionSet || update.focusChanged) {
            const pos = update.state.selection.main.head;
            const line = update.state.doc.lineAt(pos);

            emit('update:cursorInfo', {
              line: line.number,
              column: pos - line.from + 1,
            });
          }
        }),
        currentStatementLineGutter,
        readOnlyState,
        compartmentOfLineWrapping,
        tomorrow,

        showMinimap.compute(['doc'], (_state: EditorState) => {
          return {
            create,
            /* optional */
            displayText: 'blocks',
            showOverlay: 'always',
            gutters: [{ 1: '#00FF00', 2: 'green', 3: 'rgb(0, 100, 50)' }],
          };
        }),
        // indentationMarkers(),
        // regexpLinter,
      ],
    });

    editorView.value = new EditorView({
      state,
      parent: editorRef.value,
    });
  }
});

// Clean up on unmount
onUnmounted(() => {
  if (editorView.value) {
    editorView.value.destroy();
    editorView.value = null;
  }
});

// Expose methods for programmatic control
defineExpose({
  code,
  editorView,
  focus: () => editorView.value?.focus(),
  setContent: (content: string) => {
    if (editorView.value) {
      editorView.value.dispatch({
        changes: {
          from: 0,
          to: editorView.value.state.doc.length,
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
