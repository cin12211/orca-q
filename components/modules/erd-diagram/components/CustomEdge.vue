<script setup lang="ts">
import { computed } from 'vue';
import {
  BaseEdge,
  getBezierPath,
  SmoothStepEdge,
  useVueFlow,
} from '@vue-flow/core';
import CustomMarker2 from './CustomMarker2.vue';
import CustomMarker from './CustomMarker.vue';

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
  sourceX: {
    type: Number,
    required: true,
  },
  sourceY: {
    type: Number,
    required: true,
  },
  targetX: {
    type: Number,
    required: true,
  },
  targetY: {
    type: Number,
    required: true,
  },
  sourcePosition: {
    type: String,
    required: true,
  },
  targetPosition: {
    type: String,
    required: true,
  },
  source: {
    type: String,
    required: true,
  },
  target: {
    type: String,
    required: true,
  },
  data: {
    type: Object,
    required: false,
  },
});

const path = computed(() => getBezierPath(props));

const markerId = computed(() => `${props.id}-marker`);

console.log('props:', props);

// const markerColor = computed(() => {
//   const sourceNode = findNode(props.source);
//   const targetNode = findNode(props.target);

//   if (sourceNode.selected) {
//     return '#ff0072';
//   }

//   if (targetNode.selected) {
//     return '#2563eb';
//   }

//   return '#4a5568';
// });

const markerType = computed(() => {
  return 'circle';
});

const edgePathParams = computed(() =>
  getBezierPath({ ...props, curvature: 0.5 })
);
console.log('edgeedgePathParamsPath', edgePathParams[0]);
console.log('path', path[0]);
</script>

<!-- <script>
export default {
  inheritAttrs: false,
};
</script> -->

<template>
  <BaseEdge
    :id="id"
    :path="path[0]"
    :marker-end="`url(#one)`"
    :marker-start="`url(#many)`"
    :style="{ stroke: 'var(--muted-foreground)' }"
  />

  <CustomMarker
    :id="'one'"
    :type="markerType"
    :stroke-width="2"
    :width="11"
    :height="11"
  />
  <CustomMarker2
    :id="'many'"
    :type="markerType"
    :stroke-width="2"
    :width="11"
    :height="11"
  />
</template>
