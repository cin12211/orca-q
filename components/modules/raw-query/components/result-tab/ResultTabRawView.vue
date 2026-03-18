<script setup lang="ts">
import JsonEditorVue from 'json-editor-vue';

const props = defineProps<{
  formattedData: Record<string, any>[];
}>();
</script>

<template>
  <div class="h-full flex flex-col flex-1 overflow-hidden">
    <JsonEditorVue
      :modelValue="props.formattedData"
      :mode="'text' as unknown as undefined"
      :readOnly="true"
      :navigationBar="false"
      class="h-full"
    />
  </div>
</template>
