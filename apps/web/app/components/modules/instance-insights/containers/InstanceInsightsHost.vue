<script setup lang="ts">
import type { Connection } from '~/core/stores';
import { resolveInstanceInsightsPanel } from '../constants';

const props = defineProps<{
  connection?: Connection | null;
}>();

const panel = computed(() =>
  props.connection ? resolveInstanceInsightsPanel(props.connection) : null
);
</script>

<template>
  <div class="h-full">
    <div
      v-if="!connection || !panel"
      class="h-full p-4 flex flex-col items-center justify-center text-muted-foreground"
    >
      <Icon name="hugeicons:plug-socket" class="size-12 mb-2 opacity-50" />
      <p class="text-sm">Select a connection to open Instance Insights</p>
    </div>

    <component :is="panel" v-else :connection="connection" />
  </div>
</template>
