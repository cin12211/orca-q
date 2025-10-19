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
import ValueNode from '~/components/modules/erd-diagram/ValueNode.vue';
import {
  DEFAULT_ZOOM,
  DEFAULT_ZOOM_DURATION,
  MAX_ZOOM,
  MIN_ZOOM,
  ROW_WIDTH,
} from '~/components/modules/erd-diagram/constants/index';
import '~/components/modules/erd-diagram/style/vue-flow.css';
import type { ErdDiagramProps } from '~/components/modules/erd-diagram/type';
import ErdControls from './components/Controls/ErdControls.vue';
import CustomEdge from './components/CustomEdge.vue';
import ErdFilterPanal from './components/ErdFilterPanal.vue';
import { useErdFlow } from './hooks/useErdControl';

const { width, height } = useWindowSize();

const props = defineProps<ErdDiagramProps>();

const emit = defineEmits<{
  (e: 'update:isShowFilter', value: boolean): void;
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
} = useErdFlow(props);

const onArrangeDiagram = () => {
  getNodes.value?.forEach(node => {
    const position = props.matrixTablePosition?.[node.id];
    if (position) {
      node.position = position;
    }
  });

  fitView({ duration: DEFAULT_ZOOM_DURATION });
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
    @node-mouse-enter="onNodeMouseEnter"
    @node-mouse-leave="onNodeMouseLeave"
    @edge-mouse-enter="handleEdgeMouseEnter"
    @edge-mouse-leave="handleEdgeMouseLeave"
    @nodes-change="onNodesChange"
    @edges-change="onEdgesChange"
    @edge-double-click="onDoubleClickEdge"
  >
    <template #edge-custom="edgeProps">
      <CustomEdge v-bind="edgeProps" />
    </template>
    <template #node-value="nodeProps">
      <ValueNode v-bind="nodeProps" />
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
      v-model:isHand="isHand"
      v-model:isUseBgGrid="isUseBgGrid"
      v-model:isUseMiniMap="isUseMiniMap"
      @update:is-show-filter="emit('update:isShowFilter', $event)"
      @arrange="onArrangeDiagram"
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
