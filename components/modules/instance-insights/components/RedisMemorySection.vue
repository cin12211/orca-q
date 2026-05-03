<script setup lang="ts">
import type { RedisMemoryInsight } from '~/core/types/instance-insights.types';

const props = defineProps<{
  memory: RedisMemoryInsight | undefined;
}>();

const numberFormatter = new Intl.NumberFormat();

function fmt(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return '0';
  return numberFormatter.format(Number(value));
}
</script>

<template>
  <div class="space-y-4">
    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-lg border p-3">
        <p class="text-xs text-muted-foreground">Used memory</p>
        <p class="mt-1 text-lg font-medium">{{ memory?.usedMemoryHuman }}</p>
      </div>
      <div class="rounded-lg border p-3">
        <p class="text-xs text-muted-foreground">Peak memory</p>
        <p class="mt-1 text-lg font-medium">
          {{ memory?.usedMemoryPeakHuman }}
        </p>
      </div>
      <div class="rounded-lg border p-3">
        <p class="text-xs text-muted-foreground">Fragmentation</p>
        <p class="mt-1 text-lg font-medium">
          {{ memory?.memoryFragmentationRatio.toFixed(2) }}
        </p>
      </div>
      <div class="rounded-lg border p-3">
        <p class="text-xs text-muted-foreground">Maxmemory / policy</p>
        <p class="mt-1 text-lg font-medium">
          {{ memory?.maxmemoryHuman }} · {{ memory?.maxmemoryPolicy }}
        </p>
      </div>
    </div>

    <BaseNotice
      v-for="warning in memory?.warnings || []"
      :key="warning"
      variant="secondary"
    >
      {{ warning }}
    </BaseNotice>

    <div class="grid gap-4 lg:grid-cols-2">
      <div class="rounded-lg border p-3">
        <h3 class="text-sm font-medium">Top prefixes by memory</h3>
        <div class="mt-3 space-y-2 text-sm">
          <div
            v-for="prefix in memory?.topPrefixesByMemory || []"
            :key="prefix.prefix"
            class="flex items-center justify-between rounded-md bg-muted/20 px-3 py-2"
          >
            <span>{{ prefix.prefix }}</span>
            <span class="text-muted-foreground">
              {{ fmt(prefix.keyCount) }} keys · {{ fmt(prefix.memoryBytes) }} B
            </span>
          </div>
        </div>
      </div>

      <div class="rounded-lg border p-3">
        <h3 class="text-sm font-medium">Big keys detector</h3>
        <div class="mt-3 space-y-2 text-sm">
          <div
            v-for="key in memory?.bigKeys || []"
            :key="key.key"
            class="rounded-md bg-muted/20 px-3 py-2"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="truncate">{{ key.key }}</span>
              <Badge variant="outline">{{ key.type }}</Badge>
            </div>
            <p class="mt-1 text-xs text-muted-foreground">
              TTL {{ key.ttl >= 0 ? key.ttl : 'persisted' }} ·
              {{ fmt(key.memoryBytes) }} B
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
