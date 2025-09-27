<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { search } from '@codemirror/search';
import {
  Compartment,
  EditorState,
  Transaction,
  type Extension,
} from '@codemirror/state';
import { indentationMarkers } from '@replit/codemirror-indentation-markers';
import { EditorView, basicSetup } from 'codemirror';
import debounce from 'lodash/debounce';
import { cn } from '@/lib/utils';
import {
  useAppLayoutStore,
  type CodeEditorConfigs,
} from '~/shared/stores/appLayoutStore';
import {
  DEFAULT_DEBOUNCE_INPUT,
  DEFAULT_DEBOUNCE_INPUT_EDITOR,
} from '~/utils/constants';
import { EditorThemeMap } from './constants';
import {
  cursorSmooth,
  fontSizeTheme,
  selectionBaseTheme,
  minimapFactory,
} from './extensions';

// Define props
interface Props {
  modelValue?: string; // For v-model binding
  readonly?: boolean; // Read-only mode
  extensions?: Extension[]; // Additional CodeMirror extensions
  class?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  readonly: false,
  extensions: undefined,
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
const appLayoutStore = useAppLayoutStore();
let editorView = ref<EditorView | null>(null);

/* ---------------- Compartments ---------------- */
const lineWrapComp = new Compartment();
const readOnlyComp = new Compartment();
const themeComp = new Compartment();
const fontSizeComp = new Compartment();
const minimapComp = new Compartment();
const indentationComp = new Compartment();

/* ---------------- Static extensions ---------------- */
const staticExtensions: Extension[] = [
  ...(props?.extensions || []),
  basicSetup,
  search({ top: true }),
  selectionBaseTheme,
  cursorSmooth,
  lineWrapComp.of(EditorView.lineWrapping),
  readOnlyComp.of(props.readonly ? EditorState.readOnly.of(true) : []),
  EditorView.updateListener.of(
    debounce(update => {
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
    }, DEFAULT_DEBOUNCE_INPUT_EDITOR)
  ),
];

const dynamicExtensions = (cfg: CodeEditorConfigs) => {
  return [
    themeComp.of(EditorThemeMap[cfg.theme]),
    fontSizeComp.of(fontSizeTheme(cfg.fontSize + 'pt')),
    indentationComp.of(cfg.indentation ? indentationMarkers() : []),
    minimapComp.of(cfg.showMiniMap ? minimapFactory() : []),
  ];
};

const getExtensions = () => {
  return [
    ...staticExtensions,
    ...dynamicExtensions(appLayoutStore.codeEditorConfigs),
  ];
};

const setContent = (content: string, writeHistory = true) => {
  if (editorView.value) {
    editorView.value.dispatch({
      changes: {
        from: 0,
        to: editorView.value.state.doc.length,
        insert: content,
      },
      annotations: Transaction.addToHistory.of(writeHistory),
    });
    code.value = content;
  }
};

// Initialize editor on mount
onMounted(() => {
  if (editorRef.value) {
    const state = EditorState.create({
      doc: code.value,
      extensions: getExtensions(),
    });

    editorView.value = new EditorView({
      state,
      parent: editorRef.value,
    });
  }
});

/* ---------------- Reactive reconfigure ---------------- */
watch(
  () => appLayoutStore.codeEditorConfigs,
  cfg => {
    if (!editorView.value) return;

    editorView.value.dispatch({
      effects: [
        themeComp.reconfigure(EditorThemeMap[cfg.theme]),
        fontSizeComp.reconfigure(fontSizeTheme(cfg.fontSize + 'pt')),
        indentationComp.reconfigure(
          cfg.indentation ? indentationMarkers() : []
        ),
        minimapComp.reconfigure(cfg.showMiniMap ? minimapFactory() : []),
      ],
    });
  },
  { deep: true, immediate: true, flush: 'post' }
);

// Watch for external changes to modelValue
watch(
  () => props.modelValue,
  debounce(newValue => {
    if (newValue !== code.value && editorView.value) {
      setContent(newValue, false);
    }
  }, DEFAULT_DEBOUNCE_INPUT)
);

// Clean up
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
  setContent,
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
