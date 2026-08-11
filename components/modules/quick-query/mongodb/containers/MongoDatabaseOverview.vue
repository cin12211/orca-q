<script setup lang="ts">
import { toRef, watch } from 'vue';
import type { ColDef, RowClickedEvent } from 'ag-grid-community';
import BaseDataGrid from '~/components/base/data-grid/BaseDataGrid.vue';
import { useTabManagement } from '~/core/composables/useTabManagement';
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
});
const { openMongoCollectionTab } = useTabManagement();

const columnDefs: ColDef[] = [
  { field: 'name', headerName: 'Collection' },
  { field: 'documentCount', headerName: 'Documents' },
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
