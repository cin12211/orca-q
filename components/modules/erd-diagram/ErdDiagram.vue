<script lang="ts" setup>
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import '@vue-flow/controls/dist/style.css';
import { VueFlow } from '@vue-flow/core';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import { MiniMap } from '@vue-flow/minimap';
import '@vue-flow/minimap/dist/style.css';
import '@vue-flow/node-resizer/dist/style.css';
import ValueNode from '~/components/modules/erd-diagram/ValueNode.vue';
import {
  MAX_ZOOM,
  MIN_ZOOM,
} from '~/components/modules/erd-diagram/constants/index';
import '~/components/modules/erd-diagram/style/vue-flow.css';
import type { ErdDiagramProps } from '~/components/modules/erd-diagram/type';
import type { TableMetadata } from '~/server/api/get-tables';
import CustomEdge from './components/CustomEdge.vue';

const props = defineProps<ErdDiagramProps>();
// console.log('this is props', 'node props:\n', props.nodes, props.edges?.flat());
</script>

<template>
  <VueFlow
    class="erd-flow"
    :pan-on-drag="false"
    :pan-on-scroll="true"
    :pan-on-scroll-speed="1.2"
    :nodes="props.nodes"
    :edges="props.edges?.flat()"
    :default-viewport="{ zoom: 0.65 }"
    :min-zoom="MIN_ZOOM"
    :max-zoom="MAX_ZOOM"
  >
    <template #edge-custom="edgeProps">
      <CustomEdge v-bind="edgeProps" />
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
    <Controls />
    <MiniMap pannable zoomable position="top-right" />
  </VueFlow>
</template>
