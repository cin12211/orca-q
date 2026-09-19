<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { getConnectionParams } from '@/core/helpers/connection-helper';
import {
  buildDynamicColumnDefs,
  buildDynamicRowData,
  DYNAMIC_COLUMN_TYPES,
} from '~/components/base/data-grid/utils';
import {
  buildMappedColumnsFromKeys,
  buildMappedColumnsFromRows,
} from '~/core/helpers';
import { useWSStateStore } from '~/core/stores';
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';

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

const columnDefs = computed(() =>
  buildDynamicColumnDefs({
    columns: mappedColumns.value,
    rows: (data.value || []) as Record<string, unknown>[],
    columnKeyBy: 'field',
  })
);

const rowData = computed(() =>
  buildDynamicRowData((data.value || []) as Record<string, unknown>[])
);
</script>

<template>
  <div class="h-full relative p-1">
    <LoadingOverlay :visible="status === 'pending'" />

    <BaseDataGrid
      :column-defs="columnDefs"
      :row-data="rowData"
      :column-types="DYNAMIC_COLUMN_TYPES"
      class="h-full border rounded-md"
    />
  </div>
</template>
