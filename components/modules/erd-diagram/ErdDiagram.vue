<script lang="ts" setup>
import { useWindowSize } from '@vueuse/core';
import { Background } from '@vue-flow/background';
import '@vue-flow/controls/dist/style.css';
import { VueFlow } from '@vue-flow/core';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import { MiniMap } from '@vue-flow/minimap';
import '@vue-flow/minimap/dist/style.css';
import '@vue-flow/node-resizer/dist/style.css';
import ErdTableNode from '~/components/modules/erd-diagram/ErdTableNode.vue';
import {
  DEFAULT_ZOOM,
  DEFAULT_ZOOM_DURATION,
  MAX_ZOOM,
  MIN_ZOOM,
  ROW_WIDTH,
} from '~/components/modules/erd-diagram/constants/index';
import '~/components/modules/erd-diagram/styles/vue-flow.css';
import type {
  ErdDiagramProps,
  ErdLayoutAlgorithm,
  NodePosition,
} from '~/components/modules/erd-diagram/types';
import ErdControls from './components/Controls/ErdControls.vue';
import CustomEdge from './components/CustomEdge.vue';
import ErdEdgeMarkerDefs from './components/ErdEdgeMarkerDefs.vue';
import ErdFilterPanal from './components/ErdFilterPanal.vue';
import { useErdFlow } from './hooks/useErdControl';
import { buildTableNodeId } from './utils';

const { width, height } = useWindowSize();

// Unique per diagram so two ERDs on one page don't share marker ids.
const edgeMarkerPrefix = `erd-marker-${useId()}`;

export interface ErdDiagramAdditionalProps {
  isExpanded?: (tableId: string) => boolean;
  hasRelations?: (tableId: string) => boolean;
  areAllCollapsed?: boolean;
  layoutAlgorithm?: ErdLayoutAlgorithm;
}

const props = defineProps<ErdDiagramProps & ErdDiagramAdditionalProps>();

const emit = defineEmits<{
  (e: 'update:isShowFilter', value: boolean): void;
  (e: 'expand', tableId: string): void;
  (e: 'collapse', tableId: string): void;
  (e: 'toggleCollapseHeader', tableId: string): void;
  (e: 'toggleCollapseAll'): void;
  (e: 'updateNodePosition', tableId: string, position: NodePosition): void;
  (e: 'resetPositionOverrides'): void;
  (e: 'relayout'): void;
  (e: 'changeLayoutAlgorithm', algorithm: ErdLayoutAlgorithm): void;
}>();

const {
  onInitVueFlow,
  onNodesChange,
  onEdgesChange,
  onNodeMouseEnter,
  onNodeMouseLeave,
  handleEdgeMouseEnter,
  handleEdgeMouseLeave,
  onDoubleClickEdge,
  isHand,
  isUseBgGrid,
  isUseMiniMap,
  getNodes,
  fitView,
  onfocusNode,
} = useErdFlow(props, {
  onNodePositionChange: (tableId, position) => {
    emit('updateNodePosition', tableId, position);
  },
});

const applyComputedLayout = () => {
  getNodes.value?.forEach(node => {
    const position = props.matrixTablePosition?.[node.id];
    if (position) {
      node.position = position;
    }
  });

  // Drop any recorded drag overrides so a later recompute (e.g. toggling a
  // node's collapse header) doesn't resurrect the position we just discarded.
  emit('resetPositionOverrides');

  fitView({ duration: DEFAULT_ZOOM_DURATION });
};

const onArrangeDiagram = async () => {
  // Re-run the selected algorithm (picks up header collapse changes), then
  // wait for the new positions to flow back through props before applying.
  emit('relayout');
  await nextTick();
  applyComputedLayout();
};

const onChangeLayoutAlgorithm = async (algorithm: ErdLayoutAlgorithm) => {
  emit('changeLayoutAlgorithm', algorithm);
  await nextTick();
  applyComputedLayout();
};
</script>

<template>
  <VueFlow
    class="erd-flow w-full"
    :pan-on-drag="isHand"
    :pan-on-scroll="true"
    :pan-on-scroll-speed="1.2"
    :nodes="props.nodes"
    :edges="props.edges"
    :default-viewport="{
      zoom: DEFAULT_ZOOM,
      x: width / 2 - ROW_WIDTH / 2,
      y: height / 2 - 200,
    }"
    :min-zoom="MIN_ZOOM"
    :max-zoom="MAX_ZOOM"
    :only-render-visible-elements="true"
    v-on:init="onInitVueFlow"
    @node-mouse-enter="onNodeMouseEnter"
    @node-mouse-leave="onNodeMouseLeave"
    @edge-mouse-enter="handleEdgeMouseEnter"
    @edge-mouse-leave="handleEdgeMouseLeave"
    @nodes-change="onNodesChange"
    @edges-change="onEdgesChange"
    @edge-double-click="onDoubleClickEdge"
  >
    <ErdEdgeMarkerDefs :prefix="edgeMarkerPrefix" />

    <template #edge-custom="edgeProps">
      <CustomEdge v-bind="edgeProps" :marker-prefix="edgeMarkerPrefix" />
    </template>
    <template #node-value="nodeProps">
      <ErdTableNode
        v-bind="nodeProps"
        :isExpanded="
          props.isExpanded?.(
            buildTableNodeId({
              schemaName: nodeProps.data.schema,
              tableName: nodeProps.data.table,
            })
          )
        "
        :hasRelations="
          props.hasRelations?.(
            buildTableNodeId({
              schemaName: nodeProps.data.schema,
              tableName: nodeProps.data.table,
            })
          )
        "
        @expand="emit('expand', $event)"
        @collapse="emit('collapse', $event)"
        @toggleCollapseHeader="emit('toggleCollapseHeader', $event)"
      />
    </template>

    <Background v-if="isUseBgGrid" :size="2" :gap="30" :variant="isUseBgGrid" />

    <MiniMap
      v-if="isUseMiniMap"
      pannable
      position="top-right"
      node-color="var(--primary)"
      :nodeBorderRadius="10"
    />
    <ErdControls
      :isShowFilter="props.isShowFilter"
      :areAllCollapsed="props.areAllCollapsed"
      :layoutAlgorithm="props.layoutAlgorithm"
      v-model:isHand="isHand"
      v-model:isUseBgGrid="isUseBgGrid"
      v-model:isUseMiniMap="isUseMiniMap"
      @update:is-show-filter="emit('update:isShowFilter', $event)"
      @arrange="onArrangeDiagram"
      @changeLayoutAlgorithm="onChangeLayoutAlgorithm"
      @toggleCollapseAll="emit('toggleCollapseAll')"
    />
  </VueFlow>

  <ErdFilterPanal
    v-model:isShowFilter="props.isShowFilter"
    :table-id="props.tableId"
    :tables="props.tables"
    @update:is-show-filter="emit('update:isShowFilter', $event)"
    @focus-table="onfocusNode"
  />
</template>
