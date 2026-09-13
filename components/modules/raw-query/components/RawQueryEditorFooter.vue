<script setup lang="ts">
import { computed, type Component } from 'vue';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type {
  EditorCursor,
  ExplainAnalyzeOptionItem,
  ExplainAnalyzeSerializeMode,
  ExplainAnalyzeToggleOptionKey,
} from '../interfaces';
import { getRawQueryProfile, type RawQueryFooterContext } from '../registry';

const props = defineProps<{
  cursorInfo: EditorCursor;
  executeLoading: boolean;
  isStreaming: boolean;
  isRawViewMode?: boolean;
  explainAnalyzeOptionItems?: ExplainAnalyzeOptionItem[];
  serializeMode?: ExplainAnalyzeSerializeMode;
  isSupportFormat?: boolean;
  isSupportVariable?: boolean;
  isExplainSupported?: boolean;
  databaseType?: DatabaseClientType;
  customLeftComponents?: Component[];
  customRightComponents?: Component[];
}>();

const emit = defineEmits<{
  (e: 'onFormatCurrentStatement'): void;
  (e: 'onFormatAll'): void;
  (e: 'onExplainAnalyzeCurrent'): void;
  (e: 'toggleExplainOption', value: ExplainAnalyzeToggleOptionKey): void;
  (e: 'update:serializeMode', value: ExplainAnalyzeSerializeMode): void;
  (e: 'onExecuteCurrent'): void;
  (e: 'update:isRawViewMode', value: boolean): void;
  (e: 'onCancelQuery'): void;
}>();

const rawQueryProfile = computed(() => getRawQueryProfile(props.databaseType));
const footerProfile = computed(() => rawQueryProfile.value.footer);

const footerContext = computed<RawQueryFooterContext>(() => ({
  cursorInfo: props.cursorInfo,
  executeLoading: props.executeLoading,
  isStreaming: props.isStreaming,
  isRawViewMode: props.isRawViewMode,
  databaseType: props.databaseType,
  explainAnalyzeOptionItems: props.explainAnalyzeOptionItems,
  serializeMode: props.serializeMode,
  onFormatCurrentStatement: () => emit('onFormatCurrentStatement'),
  onFormatAll: () => emit('onFormatAll'),
  onExplainAnalyzeCurrent: () => emit('onExplainAnalyzeCurrent'),
  toggleExplainOption: key => emit('toggleExplainOption', key),
  updateSerializeMode: mode => emit('update:serializeMode', mode),
  onExecuteCurrent: () => emit('onExecuteCurrent'),
  updateRawViewMode: val => emit('update:isRawViewMode', val),
  onCancelQuery: () => emit('onCancelQuery'),
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
