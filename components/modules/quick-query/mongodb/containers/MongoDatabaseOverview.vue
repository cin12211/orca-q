<script setup lang="ts">
import { toRef, watch } from 'vue';
import type { ColDef, RowClickedEvent } from 'ag-grid-community';
import BaseDataGrid from '~/components/base/data-grid/BaseDataGrid.vue';
import { useTabManagement } from '~/core/composables/useTabManagement';
import { formatBytes } from '~/core/helpers/bytes-formatter';
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';
import { useMongoDatabaseCollections } from '../hooks';
import type { MongoCollectionSummary } from '../types';

const props = defineProps<{
  connectionId: string;
  workspaceId: string;
  databaseName: string;
}>();

const connectionStore = useManagementConnectionStore();
const { collections, fetchCollections } = useMongoDatabaseCollections({
  connection: toRef(connectionStore, 'selectedConnection'),
  databaseName: toRef(props, 'databaseName'),
});
const { openMongoCollectionTab } = useTabManagement();

const columnDefs: ColDef<MongoCollectionSummary>[] = [
  { field: 'name', headerName: 'Collection name' },
  {
    field: 'properties',
    headerName: 'Properties',
    valueGetter: params => (params.data?.properties || []).join(', ') || '—',
  },
  {
    field: 'storageSize',
    headerName: 'Storage size',
    valueGetter: params => formatBytes(params.data?.storageSize || 0),
  },
  {
    field: 'dataSize',
    headerName: 'Data size',
    valueGetter: params => formatBytes(params.data?.dataSize || 0),
  },
  { field: 'documentCount', headerName: 'Documents' },
  {
    field: 'avgDocumentSize',
    headerName: 'Avg. document size',
    valueGetter: params => formatBytes(params.data?.avgDocumentSize || 0),
  },
  { field: 'indexCount', headerName: 'Indexes' },
  {
    field: 'totalIndexSize',
    headerName: 'Total index size',
    valueGetter: params => formatBytes(params.data?.totalIndexSize || 0),
  },
];

const onRowClicked = (event: RowClickedEvent<MongoCollectionSummary>) => {
  if (!event.data) return;
  openMongoCollectionTab({
    databaseName: props.databaseName,
    collectionName: event.data.name,
  });
};

watch(() => props.databaseName, fetchCollections, { immediate: true });
</script>

<template>
  <div class="h-full w-full px-1">
    <BaseDataGrid
      class="h-full border rounded-md"
      :column-defs="columnDefs"
      :row-data="collections"
      @row-clicked="onRowClicked"
    />
  </div>
</template>
