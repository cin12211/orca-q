<script setup lang="ts">
import { Kbd } from '#components';

withDefaults(
  defineProps<{
    variant?: 'empty' | 'tooltip';
  }>(),
  {
    variant: 'empty',
  }
);

const items = [
  { kbd: 't:', emptyLabel: 'Search tables', tooltipLabel: 'Tables' },
  { kbd: 'v:', emptyLabel: 'Search views', tooltipLabel: 'Views' },
  { kbd: 'f:', emptyLabel: 'Search functions', tooltipLabel: 'Functions' },
  { kbd: 'tab:', emptyLabel: 'Switch tabs', tooltipLabel: 'Tabs' },
  { kbd: 'erd:', emptyLabel: 'Open ERD', tooltipLabel: 'ERD' },
  { kbd: '>', emptyLabel: 'Run commands', tooltipLabel: 'Commands' },
];
</script>

<template>
  <div v-if="variant === 'empty'" class="grid grid-cols-2 gap-2 text-xs">
    <div
      v-for="item in items"
      :key="item.kbd"
      class="flex items-center gap-2 px-2.5 py-1.5"
    >
      <Kbd class="text-xs text-primary">{{ item.kbd }}</Kbd>
      <span class="">{{ item.emptyLabel }}</span>
    </div>
  </div>

  <div v-else class="grid grid-cols-2 gap-1.5 text-[11px]">
    <div
      v-for="item in items"
      :key="item.kbd"
      class="flex items-center gap-1.5"
    >
      <Kbd class="text-[10px]">{{ item.kbd }}</Kbd>
      <span>{{ item.tooltipLabel }}</span>
    </div>
  </div>
</template>
