<script setup lang="ts">
import { DynamicTable } from '#components';
import type { MappedRawColumn } from '../../raw-query/interfaces';
import VirtualTableDefinition from './VirtualTableDefinition.vue';

const props = defineProps<{
  schema: string;
  tableName: string;
  connectionString: string;
  isVirtualTable?: boolean;
  virtualTableId?: string;
}>();

const { data, status } = useFetch('/api/get-table-structure', {
  method: 'POST',
  body: {
    dbConnectionString: props.connectionString,
    schema: props.schema,
    tableName: props.tableName,
  },
  key: `${props.schema}.${props.tableName}`,
});

const mappedColumns = computed(() => {
  if (!data.value?.[0]) {
    return [];
  }

  const columns: MappedRawColumn[] = [];
  for (const key of Object.keys(data.value?.[0])) {
    columns.push({
      isForeignKey: false,
      isPrimaryKey: false,
      originalName: key,
      queryFieldName: key,
      tableName: '',
      canMutate: false,
      aliasFieldName: key,
    });
  }

  return columns;
});
</script>

<template>
  <LoadingOverlay :visible="status === 'pending'" />

  <VirtualTableDefinition
    v-if="isVirtualTable && virtualTableId"
    :connectionString="connectionString"
    :schema="schema"
    :viewName="tableName"
    :viewId="virtualTableId!"
  />

  <DynamicTable
    :columns="mappedColumns"
    :data="data || []"
    class="h-full border rounded-md"
    columnKeyBy="field"
  />
</template>
