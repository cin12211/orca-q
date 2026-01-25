<script lang="ts" setup>
import { computed, toRef } from 'vue';
import ErdDiagram from '~/components/modules/erd-diagram/ErdDiagram.vue';
import { uuidv4 } from '~/lib/utils';
import { useErdQueryTables } from './hooks/useErdGetAllTablesData';
import { useExpandableErd } from './hooks/useExpandableErd';
import { buildTableNodeId } from './utils';

const props = defineProps<{
  tableId: string | undefined;
}>();

const wrapperRef = ref<HTMLDivElement>();

const { tableSchema, isFetching } = useErdQueryTables();

// All tables from the database
const allTables = computed(() => tableSchema.value || []);

// Get the full table ID (schema.table format)
const initialTableId = computed(() => {
  if (!props.tableId) return undefined;

  // The tableId from route might already be in schema.table format
  // or just a table name - we need to find the actual table
  const table = allTables.value.find(t => {
    const fullId = buildTableNodeId({
      schemaName: t.schema,
      tableName: t.table,
    });
    return fullId === props.tableId || t.table === props.tableId;
  });

  if (table) {
    return buildTableNodeId({
      schemaName: table.schema,
      tableName: table.table,
    });
  }

  return props.tableId;
});

// Use expandable ERD composable with auto-expand enabled
const {
  visibleNodes,
  visibleEdges,
  expandTable,
  collapseTable,
  isExpanded,
  hasRelations,
  matrixPosition,
} = useExpandableErd({
  allTables,
  initialTableId, // Pass as Ref for reactivity
  autoExpandInitial: true, // Show related tables by default
});

// Get list of tables for filter panel
const visibleTablesData = computed(() => {
  return allTables.value.filter(t => {
    const tId = buildTableNodeId({
      schemaName: t.schema,
      tableName: t.table,
    });
    return visibleNodes.value.some(node => node.id === tId);
  });
});

const isShowFilter = ref(false);

const onToggleFilter = () => {
  isShowFilter.value = !isShowFilter.value;
};

const onExpandTable = (tableId: string) => {
  expandTable(tableId);
};

const onCollapseTable = (tableId: string) => {
  collapseTable(tableId);
};

useHotkeys(
  [
    {
      key: 'meta+f',
      callback: () => {
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
      :nodes="visibleNodes"
      :edges="visibleEdges"
      :matrixTablePosition="matrixPosition"
      :focusTableId="initialTableId"
      :tables="visibleTablesData"
      :tableId="props.tableId"
      :isExpanded="isExpanded"
      :hasRelations="hasRelations"
      v-model:isShowFilter="isShowFilter"
      @expand="onExpandTable"
      @collapse="onCollapseTable"
    />
  </div>
</template>
