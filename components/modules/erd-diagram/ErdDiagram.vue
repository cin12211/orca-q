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
  MAX_ZOOM,
  MIN_ZOOM,
  ROW_WIDTH,
} from '~/components/modules/erd-diagram/constants/index';
import '~/components/modules/erd-diagram/style/vue-flow.css';
import type { ErdDiagramProps } from '~/components/modules/erd-diagram/type';
import ErdControls from './components/Controls/ErdControls.vue';
import CustomEdge from './components/CustomEdge.vue';
import { useErdFlow } from './hooks/useErdControl';

const { width, height } = useWindowSize();

const props = defineProps<ErdDiagramProps>();

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
} = useErdFlow(props);
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

    <Background />
    <ErdControls v-model:isHand="isHand" />
    <MiniMap pannable zoomable position="top-right" />
  </VueFlow>
</template>
