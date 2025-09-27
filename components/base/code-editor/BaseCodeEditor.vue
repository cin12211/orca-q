<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { search } from '@codemirror/search';
import {
  Compartment,
  EditorSelection,
  EditorState,
  Transaction,
  type Extension,
} from '@codemirror/state';
import type { ViewUpdate } from '@codemirror/view';
import { indentationMarkers } from '@replit/codemirror-indentation-markers';
import { EditorView, basicSetup } from 'codemirror';
import debounce from 'lodash/debounce';
import { cn } from '@/lib/utils';
import {
  useAppLayoutStore,
  type CodeEditorConfigs,
} from '~/shared/stores/appLayoutStore';
import { DEFAULT_DEBOUNCE_INPUT } from '~/utils/constants';
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
  initPosition?: { from: number; to: number };
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
      from: number;
      to: number;
    }
  ): void;
}>();

// Reactive code state
const code = ref(props.modelValue);
const editorRef = ref<HTMLElement | null>(null);
const appLayoutStore = useAppLayoutStore();
let editorView = ref<EditorView | null>(null);
const isInit = ref(false);

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
  EditorView.updateListener.of((update: ViewUpdate) => {
    if (update.docChanged) {
      const newCode = update.state.doc.toString();
      code.value = newCode;
      emit('update:modelValue', newCode);
    }

    if ((update.selectionSet || update.focusChanged) && isInit.value) {
      const selection = update.state.selection;
      const pos = update.state.selection.main.head;
      const line = update.state.doc.lineAt(pos);

      emit('update:cursorInfo', {
        line: line.number,
        column: pos - line.from + 1,
        from: selection.main.from,
        to: selection.main.to,
      });
    }
  }),
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

const setInitPosition = () => {
  if (props.initPosition && !isInit.value && editorView.value) {
    editorView.value.focus();
    editorView.value.dispatch({
      selection: EditorSelection.range(
        props.initPosition.from,
        props.initPosition.to
      ),
      scrollIntoView: true,
    });
    isInit.value = true;
  }
};

// Watch for external changes to modelValue
watch(
  () => props.modelValue,
  debounce(newValue => {
    if (newValue !== code.value && editorView.value) {
      setContent(newValue, false);

      setInitPosition();
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
