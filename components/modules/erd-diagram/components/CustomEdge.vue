<script setup lang="ts">
import { computed } from 'vue';
import { BaseEdge, getBezierPath, type EdgeProps } from '@vue-flow/core';
import {
  EDGE_ACTIVE_COLOR,
  EDGE_IDLE_COLOR,
  buildSharedEdgeMarkerId,
} from '../utils';
import MarkerMany from './MarkerMany.vue';
import MarkerZeroOrOne from './MarkerZeroOrOne.vue';

const props = defineProps<
  EdgeProps & {
    /**
     * Prefix of the shared markers rendered by ErdEdgeMarkerDefs. Without it
     * the edge renders its own markers.
     */
    markerPrefix?: string;
  }
>();

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

const isActive = computed(
  () =>
    !!(
      props.sourceNode?.selected ||
      props.targetNode?.selected ||
      props.animated
    )
);

const strokeColor = computed(() =>
  isActive.value ? EDGE_ACTIVE_COLOR : EDGE_IDLE_COLOR
);

const markerManyId = computed(() =>
  props.markerPrefix
    ? buildSharedEdgeMarkerId(props.markerPrefix, 'many', isActive.value)
    : `${props.id}-marker-many`
);

const markerZeroOrOneId = computed(() =>
  props.markerPrefix
    ? buildSharedEdgeMarkerId(props.markerPrefix, 'zero-or-one', isActive.value)
    : `${props.id}-marker-zero-or-one`
);
</script>

<template>
  <BaseEdge
    :id="id"
    :path="path[0]"
    :marker-start="`url(#${markerManyId})`"
    :marker-end="`url(#${markerZeroOrOneId})`"
    :style="{
      stroke: strokeColor,
      strokeWidth: animated ? 3 : 1.5,
    }"
  />

  <template v-if="!markerPrefix">
    <MarkerZeroOrOne
      :fill="strokeColor"
      :stroke-width="1.5"
      :width="30"
      :height="30"
      :id="markerZeroOrOneId"
    />
    <MarkerMany
      :fill="strokeColor"
      :stroke-width="1.5"
      :width="30"
      :height="30"
      :id="markerManyId"
    />
  </template>
</template>
