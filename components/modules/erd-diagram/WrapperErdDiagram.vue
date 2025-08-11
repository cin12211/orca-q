<script lang="ts" setup>
import { computed } from 'vue';
import ErdDiagram from '~/components/modules/erd-diagram/ErdDiagram.vue';
import { useErdQueryTables } from '~/components/modules/erd-diagram/hooks/useErdGetAllTablesData';
import { createEdges, createNodes, filterTable } from '~/utils/erd/erd-utils';

const props = defineProps<{
  tableId: string | undefined;
}>();

const { tableSchema, isFetching } = await useErdQueryTables();

const erdData = computed(() => {
  if (!props.tableId) {
    let initialEdges = createEdges(tableSchema.value || []);
    let initialNodes = createNodes(tableSchema.value || []);
    return { filteredNodes: initialNodes, filteredEdges: initialEdges };
  }

  return filterTable([props.tableId], tableSchema.value || []);
});
</script>

<template>
  <div class="w-full h-full relative">
    <LoadingOverlay :visible="isFetching" />
    <ErdDiagram
      :nodes="erdData?.filteredNodes || []"
      :edges="erdData?.filteredEdges || []"
    />
  </div>
</template>
