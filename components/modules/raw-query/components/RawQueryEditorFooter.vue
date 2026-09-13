<script setup lang="ts">
import { computed, unref, type Component } from 'vue';
import { useRawQueryContext } from '../hooks';
import { getRawQueryProfile, type RawQueryFooterContext } from '../registry';

const props = defineProps<{
  customLeftComponents?: Component[];
  customRightComponents?: Component[];
}>();

const context = useRawQueryContext();

const editor = computed(() => context?.rawQueryEditor);
const databaseType = computed(() => context?.databaseType.value);

const rawQueryProfile = computed(() => getRawQueryProfile(databaseType.value));
const footerProfile = computed(() => rawQueryProfile.value.footer);

const footerContext = computed<RawQueryFooterContext>(() => ({
  cursorInfo: editor.value?.cursorInfo.value ?? { line: 1, column: 1 },
  executeLoading: editor.value?.queryProcessState.value.executeLoading ?? false,
  isStreaming: editor.value?.queryProcessState.value.isStreaming ?? false,
  databaseType: databaseType.value,
  explainAnalyzeOptionItems:
    unref(editor.value?.explainAnalyzeOptionItems) ?? [],
  serializeMode: editor.value?.serializeMode.value,
  rawQueryEditor: editor.value,
  editor: editor.value,
  onFormatCurrentStatement: () => {
    editor.value?.onHandleFormatCurrentStatement();
  },
  onFormatAll: () => {
    editor.value?.onHandleFormatCode();
  },
  onExplainAnalyzeCurrent: () => {
    editor.value?.onExplainAnalyzeCurrent();
  },
  toggleExplainOption: key => {
    editor.value?.toggleExplainOption(key);
  },
  updateSerializeMode: mode => {
    editor.value?.setSerializeMode(mode);
  },
  onExecuteCurrent: () => {
    editor.value?.onExecuteCurrent();
  },
  onCancelQuery: () => {
    editor.value?.cancelStreamingQuery();
  },
}));

const leftComponents = computed<Component[]>(() => [
  ...(footerProfile.value.leftComponents ?? []),
  ...(props.customLeftComponents ?? []),
]);

const rightComponents = computed<Component[]>(() => [
  ...(footerProfile.value.rightComponents ?? []),
  ...(props.customRightComponents ?? []),
]);
</script>

<template>
  <div class="h-fit py-1 flex items-center justify-between px-2">
    <!-- Left Zone: Pure dynamic registration -->
    <div class="flex items-center gap-2">
      <component
        v-for="(comp, index) in leftComponents"
        :key="index"
        :is="comp"
        :context="footerContext"
      />
      <slot name="left" :context="footerContext" />
    </div>

    <!-- Right Zone: Pure dynamic registration -->
    <div class="flex gap-1 items-center">
      <slot name="before-actions" :context="footerContext" />
      <component
        v-for="(comp, index) in rightComponents"
        :key="index"
        :is="comp"
        :context="footerContext"
      />
      <slot name="right" :context="footerContext" />
    </div>
  </div>
</template>
