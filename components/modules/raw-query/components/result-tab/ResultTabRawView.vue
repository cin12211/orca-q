<script setup lang="ts">
import { useElementSize } from '@vueuse/core';
import VueJsonPretty from 'vue-json-pretty';
import 'vue-json-pretty/lib/styles.css';

defineProps<{
  formattedData: Record<string, any>[];
}>();

const jsonViewRef = useTemplateRef('jsonViewRef');
const { height } = useElementSize(jsonViewRef);
</script>

<template>
  <div
    ref="jsonViewRef"
    class="h-full flex flex-col flex-1 overflow-y-auto p-2"
  >
    <VueJsonPretty
      virtual
      showLineNumber
      showIcon
      showLength
      :height="height"
      :data="formattedData"
    />
  </div>
</template>
