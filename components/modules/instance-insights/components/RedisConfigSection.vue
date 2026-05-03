<script setup lang="ts">
import type { RedisConfigEntry } from '~/core/types/instance-insights.types';

defineProps<{
  config: RedisConfigEntry[] | undefined;
}>();
</script>

<template>
  <div class="space-y-2">
    <div
      v-for="entry in config || []"
      :key="entry.name"
      class="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
    >
      <span>{{ entry.name }}</span>
      <span class="text-muted-foreground">{{ entry.value || 'not set' }}</span>
    </div>
  </div>
</template>
