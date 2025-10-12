<script setup lang="ts">
import { computed } from 'vue';
import { Handle, Position, useVueFlow, type NodeProps } from '@vue-flow/core';
import type { ColumnMetadata, TableMetadata } from '~/server/api/get-tables';
import { HANDLE_HEIGHT, HANDLE_LEFT, ROW_HEIGHT, ROW_WIDTH } from './constants';
import { buildTableNodeId, focusNodeById, onToggleEdgeAnimated } from './utils';

const props = defineProps<NodeProps<TableMetadata>>();

const { getEdges, findNode, fitView, getViewport } = useVueFlow();

// --- 1️⃣ Precompute lookup maps (O(1) instead of array.includes)
const primaryKeySet = computed(
  () => new Set(props.data.primary_keys.map(item => item.column))
);
const foreignKeySet = computed(
  () => new Set(props.data.foreign_keys.map(item => item.column))
);

// --- 2️⃣ Precompute rows to render
const rows = computed<
  (ColumnMetadata & { isPrimary: boolean; isForeign: boolean })[]
>(() =>
  props.data.columns.map(col => ({
    ...col,
    isPrimary: primaryKeySet.value.has(col.name),
    isForeign: foreignKeySet.value.has(col.name),
  }))
);

const mapColumnIndex = computed(() => {
  return new Map<string, number>(
    rows.value.map((col, index) => [col.name, index + 1])
  );
});

const getTopPosition = (column: string) => {
  return (
    (mapColumnIndex.value.get(column) || 0) * ROW_HEIGHT -
    ROW_HEIGHT / 2 -
    1 +
    2 +
    10 +
    ROW_HEIGHT
  );
};

// --- 3️⃣ Precompute Handle positions (top coordinates)
const foreignHandles = computed(() =>
  props.data.foreign_keys.map(({ column }) => ({
    id: column,
    top: getTopPosition(column),
  }))
);

const primaryHandles = computed(() =>
  props.data.primary_keys.map(({ column }) => ({
    id: column,
    top: getTopPosition(column),
  }))
);

const onHover = (isHover: boolean) => {
  if (props.selected) {
    return;
  }

  const edges = getEdges.value;

  const mapNodeIds = new Map<string, boolean>([[props.id, isHover]]);

  onToggleEdgeAnimated({
    mapNodeIds,
    edges,
  });
};

const onFocusNode = (
  row: ColumnMetadata & { isPrimary: boolean; isForeign: boolean }
) => {
  if (!row.isForeign) {
    return;
  }

  const fkTable = props.data.foreign_keys.find(fk => fk.column === row.name);

  if (!fkTable) {
    return;
  }

  const nodeIdToFind = buildTableNodeId({
    schemaName: fkTable.reference_schema,
    tableName: fkTable.reference_table,
  });

  focusNodeById({
    nodeId: nodeIdToFind,
    findNode,
    fitView,
    getViewport,
  });
};
</script>

<template>
  <div
    class="table-node"
    @mouseenter.prevent="onHover(true)"
    @mouseleave.prevent="onHover(false)"
  >
    <div class="flex flex-col rounded-md" :style="{ width: ROW_WIDTH + 'px' }">
      <div
        class="rounded-t-md box-border p-2 bg-primary/90 flex items-center justify-center"
        :style="{ height: ROW_HEIGHT + 10 + 'px' }"
      >
        <p class="w-fit text-center px-2 box-border text-white text-xl">
          {{ data.table }}
          {{ data.schema === 'public' ? '' : `(${data.schema})` }}
        </p>
      </div>

      <!-- Columns -->
      <div
        v-for="row in rows"
        :key="row.name"
        :class="[
          'grid grid-cols-3 px-2 border-t ',
          row.isForeign && 'cursor-pointer hover:bg-background',
        ]"
        :style="{ height: ROW_HEIGHT + 'px' }"
        @click="onFocusNode(row)"
      >
        <div class="col-span-2 py-2 truncate flex items-center gap-1">
          <div class="w-6 flex items-center justify-center">
            <Icon
              v-if="row.isPrimary"
              name="hugeicons:key-01"
              class="w-4 text-yellow-400 text-xl"
            />
            <Icon
              v-else-if="row.isForeign"
              name="hugeicons:key-01"
              class="min-w-4 text-gray-400 text-xl"
            />
            <Icon
              v-else-if="row.nullable"
              name="hugeicons:diamond"
              class="min-w-4 text-gray-300"
            />
            <Icon
              v-else
              name="mynaui:diamond-solid"
              class="min-w-4 text-gray-300"
            />
          </div>
          <p class="truncate">{{ row.name }}</p>

          <Icon
            v-if="row.isForeign"
            name="hugeicons:link-04"
            class="min-w-3 text-gray-400"
          />
        </div>
        <div class="col-span-1 py-2 truncate text-center text-muted-foreground">
          {{ row.type }}
        </div>
      </div>
    </div>

    <!-- Handles -->
    <Handle
      v-for="hand in foreignHandles"
      :key="hand.id"
      type="source"
      :id="hand.id"
      :position="Position.Left"
      :connectable="false"
      :style="{
        top: hand.top + 'px',
        left: HANDLE_LEFT,
        height: HANDLE_HEIGHT,
        opacity: 0,
      }"
    />
    <Handle
      v-for="hand in primaryHandles"
      :key="hand.id"
      type="target"
      :id="hand.id"
      :position="Position.Right"
      :connectable="false"
      :style="{
        top: hand.top + 'px',
        right: HANDLE_LEFT,
        height: HANDLE_HEIGHT,
        opacity: 0,
      }"
    />
  </div>
</template>

<style scoped>
.table-node {
  will-change: transform;
  transform: translateZ(0);
  contain: content;
  backface-visibility: hidden;
}
</style>
