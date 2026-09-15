<script setup lang="ts">
import { computed } from 'vue';
import JsonEditorVue from 'json-editor-vue';
import type { RawQueryContext } from '../../registry';

const props = defineProps<{
  context: RawQueryContext;
}>();

const displayData = computed(
  () =>
    props.context.activeTab?.metadata?.rawResult ?? props.context.formattedData
);
</script>

<template>
  <div class="h-full flex flex-col flex-1 overflow-hidden">
    <BaseEmpty
      v-if="
        (props.context.formattedData?.length ?? 0) === 0 &&
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
