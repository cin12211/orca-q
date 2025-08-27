<script lang="ts" setup>
import { ref, watchEffect } from 'vue';
import { useTableSize } from '~/composables/useTableSize.js';

const props = defineProps<{ tableName: string; schemaName: string }>();
const tableSizeSummary = ref<{
  tableSize?: string;
  dataSize?: string;
  indexSize?: string;
}>({});

if (props.tableName && props.schemaName) {
  const { data } = await useTableSize({
    tableName: props.tableName,
    schemaName: props.schemaName,
  });
  tableSizeSummary.value = data.value || {};
}
</script>

<template>
  <div>
    <Card class="m-2 py-2 px-1">
      <CardContent class="px-2">
        <div class="flex flex-col gap-y-3">
          <div class="flex items-center justify-between w-full">
            <span class="text-xs">Table Size:</span>
            <span class="text-xs opacity-75">{{
              tableSizeSummary.tableSize
            }}</span>
          </div>
          <div class="flex items-center justify-between gap-4">
            <span class="text-xs">Data Size:</span>
            <span class="text-xs opacity-75">{{
              tableSizeSummary.dataSize
            }}</span>
          </div>
          <div class="flex items-center justify-between gap-4">
            <span class="text-xs">Index Size:</span>
            <span class="text-xs opacity-75">{{
              tableSizeSummary.indexSize
            }}</span>
          </div>
        </div>
      </CardContent>
    </Card>
    <Card class="m-2 py-2 px-1 text-sm">Columns</Card>
  </div>
</template>

<style lang="css" scoped></style>
