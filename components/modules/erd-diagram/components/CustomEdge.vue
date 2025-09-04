<script setup lang="ts">
import { computed } from 'vue';
import { BaseEdge, getSmoothStepPath } from '@vue-flow/core';
import type { GetBezierPathParams } from '../type';
import MarkerMany from './MarkerMany.vue';
import MarkerZeroOrOne from './MarkerZeroOrOne.vue';

interface EdgeStyle {
  stroke?: string;
}

interface CustomEdgeProps extends GetBezierPathParams {
  id: string;
  style?: EdgeStyle;
}

const props = defineProps<CustomEdgeProps>();

// for this better performance use smoothstep
// TODO : check getBezierPath when usage
const path = computed(() => getSmoothStepPath(props));

const markerZeroOrOneId = computed(() => `${props.id}-marker-zero-or-one`);
const markerManyId = computed(() => `${props.id}-marker-many`);
</script>

<template>
  <BaseEdge
    :id="id"
    :path="path[0]"
    :marker-start="`url(#${markerManyId})`"
    :marker-end="`url(#${markerZeroOrOneId})`"
    :style="{ stroke: style?.stroke || 'var(--muted-foreground)' }"
  />

  <MarkerZeroOrOne
    :id="markerZeroOrOneId"
    :width="22"
    :height="22"
    :style="{ color: style?.stroke || 'var(--muted-foreground)' }"
  />
  <MarkerMany
    :id="markerManyId"
    :width="21"
    :height="21"
    :style="{ color: style?.stroke || 'var(--muted-foreground)' }"
  />
</template>
