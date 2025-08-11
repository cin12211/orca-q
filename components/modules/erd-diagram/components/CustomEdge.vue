<script setup lang="ts">
import { computed } from 'vue';
import { BaseEdge, getSmoothStepPath } from '@vue-flow/core';
import type { GetBezierPathParams } from '../type';
import MarkerMany from './MarkerMany.vue';
import MarkerZeroOrOne from './MarkerZeroOrOne.vue';

const props = defineProps<GetBezierPathParams & { id: string }>();

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
    :style="{ stroke: 'var(--muted-foreground)' }"
  />

  <MarkerZeroOrOne
    maker-class="text-muted-foreground"
    :id="markerZeroOrOneId"
    :width="22"
    :height="22"
  />
  <MarkerMany
    maker-class="text-muted-foreground"
    :id="markerManyId"
    :width="21"
    :height="21"
  />
</template>
