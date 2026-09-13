<script setup lang="ts">
import { computed } from 'vue';
import JsonEditorVue from 'json-editor-vue';
import type { RawQueryResultViewContext } from '../../registry/rawQueryResult.types';

const props = defineProps<{
  context: RawQueryResultViewContext;
}>();

const displayData = computed(
  () =>
    props.context.activeTab.metadata.rawResult ?? props.context.formattedData
);
</script>

<template>
  <div class="h-full flex flex-col flex-1 overflow-hidden">
    <BaseEmpty
      v-if="
        props.context.formattedData.length === 0 &&
        !props.context.executeLoading &&
        !props.context.isStreaming
      "
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
