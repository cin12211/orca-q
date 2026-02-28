<script setup lang="ts">
import { DynamicTable } from '#components';
import { useAppContext } from '~/core/contexts/useAppContext';
import {
  buildMappedColumnsFromKeys,
  buildMappedColumnsFromRows,
} from '~/core/helpers';

const TABLE_OVERVIEW_COLUMN_KEYS = [
  'name',
  'schema',
  'kind',
  'owner',
  'estimated_row',
  'total_size',
  'data_size',
  'index_size',
  'comment',
] as const;

const props = defineProps<{
  connectionId?: string;
}>();

const { connectionStore, wsStateStore } = useAppContext();
const { schemaId } = toRefs(wsStateStore);

const connectionString = computed(() => {
  if (props.connectionId) {
    return connectionStore.connections.find(c => c.id === props.connectionId)
      ?.connectionString;
  }
  return connectionStore.selectedConnection?.connectionString;
});

const body = computed(() => {
  return {
    dbConnectionString: connectionString.value,
    schema: schemaId.value,
  };
});

const { data, status } = useFetch('/api/tables/overview', {
  method: 'POST',
  body,
  watch: [schemaId, body],
});

const mappedColumns = computed(() => {
  const rows = (data.value || []) as Record<string, unknown>[];
  if (rows.length > 0) {
    return buildMappedColumnsFromRows(rows);
  }

  return buildMappedColumnsFromKeys(TABLE_OVERVIEW_COLUMN_KEYS);
});
</script>

<template>
  <div class="h-full relative p-1">
    <LoadingOverlay :visible="status === 'pending'" />

    <DynamicTable
      :columns="mappedColumns"
      :data="data || []"
      class="h-full border rounded-md"
      columnKeyBy="field"
    />
  </div>
</template>
