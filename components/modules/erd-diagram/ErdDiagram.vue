<script lang="ts" setup>
import { useWindowSize } from '@vueuse/core';
import { Background } from '@vue-flow/background';
import '@vue-flow/controls/dist/style.css';
import {
  VueFlow,
  type EdgeMouseEvent,
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
import type { TableMetadata } from '~/server/api/get-tables';
import ErdControls from './components/Controls/ErdControls.vue';
import CustomEdge from './components/CustomEdge.vue';

const { width, height } = useWindowSize();

const props = defineProps<ErdDiagramProps>();

const isHand = ref(false);

const onInitVueFlow = (instance: VueFlowStore) => {
  isHand.value = false;

  if (props.focusTableId) {
    const node = instance.findNode(props.focusTableId);

    if (node) {
      node.selected = true;
    }
  }
};

const handleEdgeMouseEnter = ({ edge }: EdgeMouseEvent) => {
  if (!edge || edge.animated) return;
  edge.animated = true;
};

const handleEdgeMouseLeave = ({ edge }: EdgeMouseEvent) => {
  if (!edge || !edge.animated) return;
  edge.animated = false;
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
    @edge-update-start="
      () => {
        console.log('edge-update-start');
      }
    "
    @edge-update-end="
      () => {
        console.log('edge-update-end');
      }
    "
  >
    <template #edge-custom="edgeProps">
      <CustomEdge
        :id="edgeProps.id"
        :curvature="edgeProps.curvature"
        :source-position="edgeProps.sourcePosition"
        :source-x="edgeProps.sourceX"
        :source-y="edgeProps.sourceY"
        :target-position="edgeProps.targetPosition"
        :target-x="edgeProps.targetX"
        :target-y="edgeProps.targetY"
        :edgeProps="edgeProps"
      />
    </template>
    <template #node-value="nodeProps">
      <ValueNode
        :id="nodeProps.id"
        :columns="(nodeProps.data as TableMetadata).columns"
        :table="(nodeProps.data as TableMetadata).table"
        :primary_keys="(nodeProps.data as TableMetadata).primary_keys"
        :foreign_keys="(nodeProps.data as TableMetadata).foreign_keys"
        :comment="(nodeProps.data as TableMetadata).comment"
        :indexes="(nodeProps.data as TableMetadata).indexes"
        :rows="(nodeProps.data as TableMetadata).rows"
        :schema="(nodeProps.data as TableMetadata).schema"
        :type="(nodeProps.data as TableMetadata).type"
      />
    </template>

    <Background />
    <ErdControls v-model:isHand="isHand" />
    <MiniMap pannable zoomable position="top-right" />
  </VueFlow>
</template>
