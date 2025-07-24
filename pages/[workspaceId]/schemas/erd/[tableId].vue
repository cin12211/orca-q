<script lang="ts" setup>
import { ref, computed } from 'vue';
import '@vue-flow/controls/dist/style.css';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/minimap/dist/style.css';
import '@vue-flow/node-resizer/dist/style.css';
import ErdDiagram from '~/components/modules/erd-diagram/ErdDiagram.vue';
import { useErdQueryTables } from '~/components/modules/erd-diagram/hooks/useErdGetAllTablesData';
import { filterTable } from '~/utils/erd/erd-utils';

const { tableSchema } = await useErdQueryTables();

const route = useRoute('workspaceId-schemas-erd-tableId');
const tableId = computed(() => route.params.tableId as string);

const erdData = computed(() => {
  if (!tableId.value) return { filteredNodes: [], filteredEdges: [] };
  return filterTable(
    [tableId.value],
    tableSchema.value?.result[0]?.metadata['tables'] || []
  );
});
</script>

<template>
  <ErdDiagram :nodes="erdData.filteredNodes" :edges="erdData.filteredEdges" />
</template>
