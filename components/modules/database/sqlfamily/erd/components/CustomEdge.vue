<script setup lang="ts">
import { computed } from 'vue';
import { BaseEdge, getBezierPath, type EdgeProps } from '@vue-flow/core';
import MarkerMany from './MarkerMany.vue';
import MarkerZeroOrOne from './MarkerZeroOrOne.vue';

const props = defineProps<EdgeProps>();

// for this better performance use smoothstep
// TODO : check getBezierPath when usage
const path = computed(() =>
  getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
    curvature: 0.6,
  })
);

const markerZeroOrOneId = computed(() => `${props.id}-marker-zero-or-one`);
const markerManyId = computed(() => `${props.id}-marker-many`);

const animatedColor = computed(() => {
  const isNeedAnimated =
    props.sourceNode?.selected || props.targetNode?.selected || props.animated;

  if (isNeedAnimated) {
    return 'var(--color-primary)';
  }

  return 'var(--color-zinc-400)';
});
</script>

<template>
  <BaseEdge
    :id="id"
    :path="path[0]"
    :marker-start="`url(#${markerManyId})`"
    :marker-end="`url(#${markerZeroOrOneId})`"
    :style="{
      stroke: animatedColor,
      strokeWidth: animated ? 3 : 1.5,
    }"
  />

  <MarkerZeroOrOne
    :fill="animatedColor"
    :stroke-width="1.5"
    :width="30"
    :height="30"
    :id="markerZeroOrOneId"
  />
  <MarkerMany
    :fill="animatedColor"
    :stroke-width="1.5"
    :width="30"
    :height="30"
    :id="markerManyId"
  />
</template>
<style>
/* TODO: if needed more performance to gpu */
/* .vue-flow__edge.vue-flow__edge-custom.animated > path {
  stroke: var(--color-primary) !important;
  stroke-width: 2.5px;
} */

/* .vue-flow__edge.vue-flow__edge-custom {
  color: var(--color-zinc-400);
}

.vue-flow__edge.vue-flow__edge-custom.animated {
  color: var(--color-primary) !important;
}
 */
</style>
