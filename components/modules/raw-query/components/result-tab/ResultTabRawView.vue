<script setup lang="ts">
import { computed } from 'vue';
import JsonEditorVue from 'json-editor-vue';

const props = defineProps<{
  formattedData: Record<string, any>[];
  executeLoading: boolean;
  isStreaming: boolean;
  rawData?: unknown;
}>();

const displayData = computed(() =>
  props.rawData === undefined ? props.formattedData : props.rawData
);
</script>

<template>
  <div class="h-full flex flex-col flex-1 overflow-hidden">
    <BaseEmpty
      v-if="props.formattedData.length === 0 && !executeLoading && !isStreaming"
      title="No Raw Data"
      desc="The query returned no records to display as JSON."
    />
    <JsonEditorVue
      v-else
      :modelValue="displayData"
      :mode="'text' as unknown as undefined"
      :readOnly="true"
      :navigationBar="false"
      class="h-full"
    />
  </div>
</template>
