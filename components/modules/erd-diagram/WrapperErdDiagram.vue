<script lang="ts" setup>
import { computed } from 'vue';
import type { Edge } from '@vue-flow/core';
import ErdDiagram from '~/components/modules/erd-diagram/ErdDiagram.vue';
import { uuidv4 } from '~/lib/utils';
import { useErdQueryTables } from './hooks/useErdGetAllTablesData';
import type { MatrixTablePosition, TableNode } from './type';
import {
  buildERDWithPrimaryTables,
  getTablesByTableCenterId,
  oldBuildFullERD,
} from './utils';

const props = defineProps<{
  tableId: string | undefined;
}>();

const wrapperRef = ref<HTMLDivElement>();

const { tableSchema, isFetching } = useErdQueryTables();

const tables = computed(() => {
  if (!props.tableId) {
    return undefined;
  }

  return getTablesByTableCenterId(props.tableId, tableSchema.value || []);
});

const erd = computed<{
  edges: Edge[];
  nodes: TableNode[];
  matrixPosition?: MatrixTablePosition;
}>(() => {
  if (!tables.value) {
    return {
      nodes: [],
      edges: [],
    };
  }

  if (!props.tableId) {
    return oldBuildFullERD(tableSchema.value || []);
  }

  return buildERDWithPrimaryTables(tables.value);
});

const isShowFilter = ref(false);

const onToggleFilter = () => {
  isShowFilter.value = !isShowFilter.value;
};

useHotkeys(
  [
    {
      key: 'meta+f',
      callback: () => {
        console.log('🚀 ~ onToggleFilter ~ onToggleFilter');
        onToggleFilter();
      },
      isPreventDefault: true,
    },
  ],
  {
    target: wrapperRef,
  }
);
</script>

<template>
  <div class="w-full h-full relative" ref="wrapperRef" :id="uuidv4()">
    <LoadingOverlay :visible="isFetching" />
    <ErdDiagram
      :nodes="erd.nodes"
      :edges="erd.edges"
      :matrixTablePosition="erd?.matrixPosition"
      :focusTableId="props.tableId"
      :tables="tables?.tables || []"
      :tableId="tableId"
      v-model:isShowFilter="isShowFilter"
    />
  </div>
</template>
