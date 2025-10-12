<script lang="ts" setup>
import { computed } from 'vue';
import ErdDiagram from '~/components/modules/erd-diagram/ErdDiagram.vue';
import { useErdQueryTables } from '~/components/modules/erd-diagram/hooks/useErdGetAllTablesData';
import { buildERDWithPrimaryTables, oldBuildFullERD } from './utils';

const props = defineProps<{
  tableId: string | undefined;
}>();

const { tableSchema, isFetching } = useErdQueryTables();

const erdData = computed(() => {
  if (!props.tableId) {
    return oldBuildFullERD(tableSchema.value || []);
  }

  return buildERDWithPrimaryTables(props.tableId, tableSchema.value || []);
});
</script>

<template>
  <div class="w-full h-full relative">
    <LoadingOverlay :visible="isFetching" />
    <ErdDiagram
      :nodes="erdData.nodes"
      :edges="erdData.edges"
      :focusTableId="props.tableId"
    />
  </div>
</template>
