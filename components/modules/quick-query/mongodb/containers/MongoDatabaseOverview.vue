<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue';
import type { ColDef, GridApi, RowClickedEvent } from 'ag-grid-community';
import BaseDataGrid from '~/components/base/data-grid/BaseDataGrid.vue';
import { useDataGridAutoSizing } from '~/components/base/data-grid/hooks';
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
const { collections, isLoading, fetchCollections } =
  useMongoDatabaseCollections({
    connection: toRef(connectionStore, 'selectedConnection'),
    databaseName: toRef(props, 'databaseName'),
  });
const { openMongoCollectionTab } = useTabManagement();

const isEmpty = computed(
  () => !isLoading.value && collections.value.length === 0
);

const defaultColDef: ColDef = {
  sortable: true,
  filter: true,
  resizable: true,
};

const columnDefs: ColDef<MongoCollectionSummary>[] = [
  {
    field: 'name',
    headerName: 'Collection name',
    sortable: true,
    filter: 'agTextColumnFilter',
  },
  {
    field: 'properties',
    headerName: 'Properties',
    valueGetter: params => (params.data?.properties || []).join(', ') || '—',
    sortable: true,
    filter: 'agTextColumnFilter',
  },
  {
    field: 'storageSize',
    headerName: 'Storage size',
    valueGetter: params => formatBytes(params.data?.storageSize || 0),
    sortable: true,
    filter: 'agNumberColumnFilter',
    comparator: (_valueA, _valueB, nodeA, nodeB) =>
      (nodeA.data?.storageSize || 0) - (nodeB.data?.storageSize || 0),
  },
  {
    field: 'dataSize',
    headerName: 'Data size',
    valueGetter: params => formatBytes(params.data?.dataSize || 0),
    sortable: true,
    filter: 'agNumberColumnFilter',
    comparator: (_valueA, _valueB, nodeA, nodeB) =>
      (nodeA.data?.dataSize || 0) - (nodeB.data?.dataSize || 0),
  },
  {
    field: 'documentCount',
    headerName: 'Documents',
    sortable: true,
    filter: 'agNumberColumnFilter',
  },
  {
    field: 'avgDocumentSize',
    headerName: 'Avg. document size',
    valueGetter: params => formatBytes(params.data?.avgDocumentSize || 0),
    sortable: true,
    filter: 'agNumberColumnFilter',
    comparator: (_valueA, _valueB, nodeA, nodeB) =>
      (nodeA.data?.avgDocumentSize || 0) - (nodeB.data?.avgDocumentSize || 0),
  },
  {
    field: 'indexCount',
    headerName: 'Indexes',
    sortable: true,
    filter: 'agNumberColumnFilter',
  },
  {
    field: 'totalIndexSize',
    headerName: 'Total index size',
    valueGetter: params => formatBytes(params.data?.totalIndexSize || 0),
    sortable: true,
    filter: 'agNumberColumnFilter',
    comparator: (_valueA, _valueB, nodeA, nodeB) =>
      (nodeA.data?.totalIndexSize || 0) - (nodeB.data?.totalIndexSize || 0),
  },
];

const baseGridRef = ref<InstanceType<typeof BaseDataGrid>>();
const gridApi = computed<GridApi | null>(
  () => (baseGridRef.value?.gridApi as GridApi | null | undefined) ?? null
);

const { onRowDataUpdated } = useDataGridAutoSizing({
  gridApi,
  data: collections,
});

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
  <div class="flex flex-col h-full w-full relative">
    <LoadingOverlay :visible="isLoading" />

    <div class="flex-1 overflow-hidden px-1 mb-0.5">
      <BaseEmpty
        v-if="isEmpty"
        title="No collections found"
        desc="This database has no collections yet."
      />
      <BaseDataGrid
        v-else
        ref="baseGridRef"
        class="h-full border rounded-md"
        :column-defs="columnDefs"
        :row-data="collections"
        :grid-options="{ defaultColDef }"
        @row-clicked="onRowClicked"
        @row-data-updated="onRowDataUpdated"
      />
    </div>
  </div>
</template>
