<script lang="ts" setup>
import { ref, computed } from 'vue';
import { Background } from '@vue-flow/background';
import '@vue-flow/controls/dist/style.css';
import { VueFlow } from '@vue-flow/core';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/minimap/dist/style.css';
import '@vue-flow/node-resizer/dist/style.css';
import ErdDiagram from '~/components/modules/erd-diagram/ErdDiagram.vue';
import { filterTable } from '~/utils/erd/erd-utils';
import { dbSchema } from '~/utils/index';

const route = useRoute('workspaceId-schemas-erd-tableId');
const tableId = computed(() => route.params.tableId as string);

const erdData = computed(() => {
  if (!tableId.value) return { filteredNodes: [], filteredEdges: [] };
  return filterTable([tableId.value], dbSchema['tables']);
});
</script>

<template>
  <ErdDiagram :nodes="erdData.filteredNodes" :edges="erdData.filteredEdges" />
</template>
