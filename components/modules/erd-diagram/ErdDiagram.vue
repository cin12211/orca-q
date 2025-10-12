<script lang="ts" setup>
import { useWindowSize } from '@vueuse/core';
import { Background } from '@vue-flow/background';
import '@vue-flow/controls/dist/style.css';
import {
  useVueFlow,
  VueFlow,
  type EdgeChange,
  type EdgeMouseEvent,
  type NodeChange,
  type VueFlowStore,
} from '@vue-flow/core';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import { MiniMap } from '@vue-flow/minimap';
import '@vue-flow/minimap/dist/style.css';
import '@vue-flow/node-resizer/dist/style.css';
import ValueNode from '~/components/modules/erd-diagram/ValueNode.vue';
import {
  DEFAULT_ZOOM,
  MAX_ZOOM,
  MIN_ZOOM,
  ROW_WIDTH,
} from '~/components/modules/erd-diagram/constants/index';
import '~/components/modules/erd-diagram/style/vue-flow.css';
import type { ErdDiagramProps } from '~/components/modules/erd-diagram/type';
import ErdControls from './components/Controls/ErdControls.vue';
import CustomEdge from './components/CustomEdge.vue';
import { onToggleEdgeAnimated, setAnimatedEdge } from './utils/active-edge';

const { width, height } = useWindowSize();

const props = defineProps<ErdDiagramProps>();

const isHand = ref(false);

const { getEdges } = useVueFlow();

const onInitVueFlow = (instance: VueFlowStore) => {
  if (props.focusTableId) {
    const node = instance.findNode(props.focusTableId);

    if (node) {
      node.selected = true;

      const mapNodeIds = new Map<string, boolean>([[node.id, true]]);

      const edges = instance.getEdges.value;

      onToggleEdgeAnimated({
        mapNodeIds,
        edges,
      });
    }
  }
};

const handleEdgeMouseEnter = ({ edge }: EdgeMouseEvent) => {
  if (!edge || edge.animated) return;

  setAnimatedEdge(edge, true);
};

const handleEdgeMouseLeave = ({ edge }: EdgeMouseEvent) => {
  if (!edge || !edge.animated) return;

  setAnimatedEdge(edge, false);
};

const onNodesChange = (nodes: NodeChange[]) => {
  const mapNodeIds = new Map<string, boolean>();
  nodes.forEach(node => {
    if (node.type === 'select') {
      mapNodeIds.set(node.id, node.selected);
    }
  });

  if (mapNodeIds.size === 0) return;
  const edges = getEdges.value;
  onToggleEdgeAnimated({
    mapNodeIds,
    edges,
  });
};

const onEdgesChange = (edgeChanges: EdgeChange[]) => {
  const mapEdgeIds = new Map<string, boolean>();

  edgeChanges.forEach(edge => {
    if (edge.type === 'select') {
      mapEdgeIds.set(edge.id, edge.selected);
    }
  });

  if (mapEdgeIds.size === 0) return;
  const edges = getEdges.value;
  onToggleEdgeAnimated({
    mapEdgeIds,
    edges,
  });
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
    v-on:init="onInitVueFlow"
    @edge-mouse-enter="handleEdgeMouseEnter"
    @edge-mouse-leave="handleEdgeMouseLeave"
    @nodes-change="onNodesChange"
    @edges-change="onEdgesChange"
  >
    <template #edge-custom="edgeProps">
      <CustomEdge v-bind="edgeProps" />
    </template>
    <template #node-value="nodeProps">
      <ValueNode v-bind="nodeProps" />
    </template>

    <Background />
    <ErdControls v-model:isHand="isHand" />
    <MiniMap pannable zoomable position="top-right" />
  </VueFlow>
</template>
