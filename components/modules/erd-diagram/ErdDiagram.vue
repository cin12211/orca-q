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
import '~/components/modules/erd-diagram/style/vue-flow.css';
import type {
  ErdDiagramProps,
  Edge,
} from '~/components/modules/erd-diagram/type';

const props = defineProps<ErdDiagramProps>();

const tableNodes = ref(props.nodes || []);
const edges = ref<Edge[]>([]);

watch(
  () => props.nodes,
  newNodes => {
    if (newNodes) {
      tableNodes.value = newNodes;
    }
  },
  { deep: true }
);

watch(
  () => props.edges,
  newEdges => {
    if (newEdges) {
      edges.value = newEdges.flat();
    }
  },
  { deep: true }
);

onMounted(() => {
  if (props.edges) {
    edges.value = props.edges.flat();
  }
});
</script>

<template>
  <VueFlow
    class="math-flow"
    :nodes="tableNodes"
    :edges="edges"
    :default-viewport="{ zoom: 1 }"
    :min-zoom="0.1"
    :max-zoom="4"
  >
    <template #node-value="props">
      <ValueNode :id="props.id" :data="props.data" />
    </template>
    <Background />
  </VueFlow>
</template>
