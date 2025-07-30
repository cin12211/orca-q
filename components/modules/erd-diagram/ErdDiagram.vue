<script lang="ts" setup>
import { ref, watch, onMounted } from 'vue';
import { Background } from '@vue-flow/background';
import '@vue-flow/controls/dist/style.css';
import { VueFlow } from '@vue-flow/core';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/minimap/dist/style.css';
import '@vue-flow/node-resizer/dist/style.css';
import ValueNode from '~/components/modules/erd-diagram/ValueNode.vue';
import {
  MIN_ZOOM,
  MAX_ZOOM,
} from '~/components/modules/erd-diagram/constants/index';
import '~/components/modules/erd-diagram/style/vue-flow.css';
import type {
  DBSchemaProps,
  ErdDiagramProps,
} from '~/components/modules/erd-diagram/type';
import type { TableMetadata } from '~/server/api/get-tables';

const props = defineProps<ErdDiagramProps>();
console.log('this is props', props);
</script>

<template>
  <VueFlow
    class="erd-flow"
    :nodes="props.nodes"
    :edges="props.edges?.flat()"
    :default-viewport="{ zoom: 0.65 }"
    :min-zoom="MIN_ZOOM"
    :max-zoom="MAX_ZOOM"
  >
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
  </VueFlow>
</template>
