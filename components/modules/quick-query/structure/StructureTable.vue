<script setup lang="ts">
import { DynamicTable } from '#components';
import {
  buildMappedColumnsFromKeys,
  buildMappedColumnsFromRows,
} from '~/core/helpers';
import VirtualTableDefinition from './VirtualTableDefinition.vue';

const props = defineProps<{
  schema: string;
  tableName: string;
  connectionString: string;
  isVirtualTable?: boolean;
  virtualTableId?: string;
}>();

const STRUCTURE_TABLE_COLUMN_KEYS = [
  'column_name',
  'data_type',
  'is_nullable',
  'default_value',
  'foreign_keys',
  'on_update',
  'on_delete',
  'column_comment',
] as const;

const { data, status } = useFetch('/api/tables/structure', {
  method: 'POST',
  body: {
    dbConnectionString: props.connectionString,
    schema: props.schema,
    tableName: props.tableName,
  },
  key: `${props.schema}.${props.tableName}`,
});

const mappedColumns = computed(() => {
  const rows = (data.value || []) as Record<string, unknown>[];
  if (rows.length > 0) {
    return buildMappedColumnsFromRows(rows);
  }

  return buildMappedColumnsFromKeys(STRUCTURE_TABLE_COLUMN_KEYS);
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
