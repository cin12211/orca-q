<script setup lang="ts">
import { computed, ref } from 'vue';
import type { GridApi } from 'ag-grid-community';
import BaseDataGrid from '~/components/base/data-grid/BaseDataGrid.vue';
import { useDataGridAutoSizing } from '~/components/base/data-grid/hooks';
import type { MongoDocument } from '../types';
import { buildMongoColumnDefs } from '../utils';

const props = defineProps<{ documents: MongoDocument[] }>();

const columnDefs = computed(() => buildMongoColumnDefs(props.documents));

const baseGridRef = ref<InstanceType<typeof BaseDataGrid>>();
const gridApi = computed<GridApi | null>(
  () => (baseGridRef.value?.gridApi as GridApi | null | undefined) ?? null
);

const documentsRef = computed(() => props.documents);

const { onRowDataUpdated } = useDataGridAutoSizing({
  gridApi,
  data: documentsRef,
});

const scrollToTop = () => {
  gridApi.value?.ensureIndexVisible(0, 'top');
};

defineExpose({ scrollToTop });
</script>

<template>
  <BaseDataGrid
    ref="baseGridRef"
    class="h-full border rounded-md"
    :column-defs="columnDefs"
    :row-data="props.documents"
    allow-editing
    @row-data-updated="onRowDataUpdated"
  />
</template>
