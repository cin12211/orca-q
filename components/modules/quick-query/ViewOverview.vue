<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { DynamicTable } from '#components';
import { getConnectionParams } from '@/core/helpers/connection-helper';
import {
  buildMappedColumnsFromKeys,
  buildMappedColumnsFromRows,
} from '~/core/helpers';
import { useWSStateStore } from '~/core/stores';
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';

const VIEW_OVERVIEW_COLUMN_KEYS = [
  'name',
  'schema',
  'type',
  'owner',
  'comment',
] as const;

const props = defineProps<{
  connectionId?: string;
}>();

const connectionStore = useManagementConnectionStore();
const wsStateStore = useWSStateStore();
const { schemaId } = storeToRefs(wsStateStore);

const connection = computed(() => {
  if (props.connectionId) {
    return connectionStore.connections.find(c => c.id === props.connectionId);
  }
  return connectionStore.selectedConnection;
});

const body = computed(() => {
  return {
    ...getConnectionParams(connection.value),
    schema: schemaId.value,
  };
});

const { data, status } = useFetch('/api/views/overview', {
  method: 'POST',
  body,
  watch: [schemaId, body],
});

const mappedColumns = computed(() => {
  const rows = (data.value || []) as Record<string, unknown>[];
  if (rows.length > 0) {
    return buildMappedColumnsFromRows(rows);
  }

  return buildMappedColumnsFromKeys(VIEW_OVERVIEW_COLUMN_KEYS);
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
