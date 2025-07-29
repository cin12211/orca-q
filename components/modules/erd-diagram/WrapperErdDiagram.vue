<script lang="ts" setup>
import { computed } from 'vue';
import '@vue-flow/controls/dist/style.css';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/minimap/dist/style.css';
import '@vue-flow/node-resizer/dist/style.css';
import ErdDiagram from '~/components/modules/erd-diagram/ErdDiagram.vue';
import { useErdQueryTables } from '~/components/modules/erd-diagram/hooks/useErdGetAllTablesData';
import { filterTable } from '~/utils/erd/erd-utils';

const props = defineProps<{
  tableId: string;
}>();

const { tableSchema } = await useErdQueryTables();

const erdData = computed(() => {
  if (!props.tableId) return { filteredNodes: [], filteredEdges: [] };

  return filterTable([props.tableId], tableSchema || []);
});
// TODO: [Nhat] sử dụng wrapperErd ở everywhere.
</script>

<template>
  <ErdDiagram :nodes="erdData?.filteredNodes" :edges="erdData?.filteredEdges" />
</template>
