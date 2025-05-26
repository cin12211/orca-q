<script lang="ts" setup>
import { ref } from 'vue';
import { Background } from '@vue-flow/background';
import '@vue-flow/controls/dist/style.css';
import { VueFlow } from '@vue-flow/core';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/minimap/dist/style.css';
import '@vue-flow/node-resizer/dist/style.css';
import OperatorNode from './OperatorNode.vue';
import ResultNode from './ResultNode.vue';
import ValueNode from './ValueNode.vue';
import { initialEdges, initialNodes } from './initial-elements';

// const convertToNode = (tables => {
//   const nodes = [];

//   tables.forEach((table, index) => {
//     nodes.push({
//       id: `table-${index + 1}`,
//       type: 'value',
//       position: { x: index * 100, y: index * 100 },
//       data: { value: table },
//     });
//   });

//   return nodes;
// };

const tableNodes = ref(initialNodes);
// console.log('firstNode', firstNode.value);

const edges = ref();

onMounted(() => {
  // console.log('tableNodes', tableNodes.value);
  // console.log('edges', edges.value);
  edges.value = initialEdges.flat();
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

    <!-- <template #node-operator="props">
      <OperatorNode :id="props.id" :data="props.data" />
    </template>

    <template #node-result="props">
      <ResultNode :id="props.id" />
    </template> -->

    <Background />
  </VueFlow>
</template>

<style>
.vue-flow__minimap {
  transform: scale(75%);
  transform-origin: bottom right;
}

.math-flow {
  background-color: #edf2f7;
  height: 100%;
  width: 100%;
}

.vue-flow__handle {
  height: 24px;
  width: 10px;
  background: #aaa;
  border-radius: 4px;
}

.vue-flow__edges path {
  stroke-width: 3;
}

.vue-flow__node {
  background-color: #f3f4f6;
}

.vue-flow__node-value {
  display: flex;
  align-items: center;
  gap: 8px;
  /* padding:8px 16px; */
  /* border-radius:20px; */

  border-radius: var(--radius);
  box-shadow: 0 0 10px #0003;
}

.vue-flow__node-value.selected {
  box-shadow: 0 0 0 2px #ec4899;
}

.vue-flow__node-value input {
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 8px;
  box-shadow: 0 0 10px #0000001a;
}

.vue-flow__node-value input:focus {
  outline: none;
  box-shadow: 0 0 0 2px #ec4899;
  transition: box-shadow 0.2s;
}

.vue-flow__node-value .vue-flow__handle {
  background-color: #ec4899;
}

.vue-flow__node-operator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 24px;
  border-radius: 8px;
  box-shadow: 0 0 10px #0003;
}

.vue-flow__node-operator.selected {
  box-shadow: 0 0 0 2px #2563eb;
}

.vue-flow__node-operator .buttons {
  display: flex;
  gap: 8px;
}

.vue-flow__node-operator button {
  border: none;
  cursor: pointer;
  background-color: #4a5568;
  border-radius: 8px;
  color: #fff;
  box-shadow: 0 0 10px #0000004d;
  width: 40px;
  height: 40px;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.vue-flow__node-operator button svg {
  width: 100%;
  height: 100%;
}

.vue-flow__node-operator button:hover {
  background-color: #2563eb;
  transition: background-color 0.2s;
}

.vue-flow__node-operator button.selected {
  background-color: #2563eb;
}

.vue-flow__node-operator .vue-flow__handle[data-handleid='target-a'] {
  top: 25%;
}

.vue-flow__node-operator .vue-flow__handle[data-handleid='target-b'] {
  top: 75%;
}

.vue-flow__node-operator .vue-flow__handle {
  background-color: #2563eb;
}

.vue-flow__node-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 24px;
  border-radius: 8px;
  box-shadow: 0 0 10px #0003;
}

.vue-flow__node-result.selected {
  box-shadow: 0 0 0 2px #5ec697;
}

.vue-flow__node-result .result {
  display: flex;
  gap: 8px;
  font-size: 24px;
}

input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type='number'] {
  -moz-appearance: textfield;
}
</style>
