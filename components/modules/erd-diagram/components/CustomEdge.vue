<script setup lang="ts">
import { computed } from 'vue';
import {
  BaseEdge,
  getBezierPath,
  useVueFlow,
  type EdgeProps,
} from '@vue-flow/core';
import type { GetBezierPathParams } from '../type';
import MarkerMany from './MarkerMany.vue';
import MarkerZeroOrOne from './MarkerZeroOrOne.vue';

const props = defineProps<
  GetBezierPathParams & {
    id: string;
    edgeProps: EdgeProps;
  }
>();

const { getNode, setEdges } = useVueFlow();

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

const handleHover = (hover: boolean) => {
  console.log('🚀 ~ handleHover ~ hover:', hover);
  // animate this edge
  setEdges(edges =>
    edges.map(e => (e.id === props.id ? { ...e, animated: hover } : e))
  );

  // active source + target node (table)
  const src = getNode.value(props.edgeProps.source);
  const tgt = getNode.value(props.edgeProps.target);
  if (src) src.selected = hover;
  if (tgt) tgt.selected = hover;
};

const handleMouseEnter = () => {
  console.log('🚀 ~ handleMouseEnter ~ handleMouseEnter:', handleMouseEnter);
};

const handleMouseLeave = () => {
  console.log('🚀 ~ handleMouseLeave ~ handleMouseLeave:', handleMouseLeave);
};
</script>

<template>
  <BaseEdge
    :id="id"
    :path="path[0]"
    :marker-start="`url(#${markerManyId})`"
    :marker-end="`url(#${markerZeroOrOneId})`"
    :style="{ stroke: 'var(--color-zinc-400)' }"
    :onclick="
      () => {
        console.log('clicked');
      }
    "
  />

  <MarkerZeroOrOne :id="markerZeroOrOneId" :width="30" :height="30" />
  <MarkerMany :id="markerManyId" :width="30" :height="30" />
</template>
<style>
.vue-flow__edge.vue-flow__edge-custom.animated > path {
  stroke: var(--color-primary) !important;
  stroke-width: 2.5px;
}

.vue-flow__edge.vue-flow__edge-custom {
  color: var(--color-zinc-400);
}
.vue-flow__edge.vue-flow__edge-custom.animated {
  color: var(--color-primary);
}
</style>
