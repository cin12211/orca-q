<script setup lang="ts">
import {
  EDGE_ACTIVE_COLOR,
  EDGE_IDLE_COLOR,
  buildSharedEdgeMarkerId,
} from '../utils';
import MarkerMany from './MarkerMany.vue';
import MarkerZeroOrOne from './MarkerZeroOrOne.vue';

defineProps<{
  prefix: string;
}>();
</script>

<template>
  <!-- One set of markers for every edge in the diagram, instead of two
       <marker> elements per edge. -->
  <svg
    class="pointer-events-none absolute size-0 overflow-hidden"
    aria-hidden="true"
  >
    <defs>
      <template v-for="state in ['idle', 'active'] as const" :key="state">
        <MarkerMany
          :id="buildSharedEdgeMarkerId(prefix, 'many', state === 'active')"
          :fill="state === 'active' ? EDGE_ACTIVE_COLOR : EDGE_IDLE_COLOR"
          :stroke-width="1.5"
          :width="30"
          :height="30"
        />
        <MarkerZeroOrOne
          :id="
            buildSharedEdgeMarkerId(prefix, 'zero-or-one', state === 'active')
          "
          :fill="state === 'active' ? EDGE_ACTIVE_COLOR : EDGE_IDLE_COLOR"
          :stroke-width="1.5"
          :width="30"
          :height="30"
        />
      </template>
    </defs>
  </svg>
</template>
