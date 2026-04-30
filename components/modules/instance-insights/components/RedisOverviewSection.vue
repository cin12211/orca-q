<script setup lang="ts">
import type { RedisOverviewMetrics } from '~/core/types/instance-insights.types';
import { formatDuration } from '../utils/formatters';

const props = defineProps<{
  overview: RedisOverviewMetrics | undefined;
}>();

const numberFormatter = new Intl.NumberFormat();

function fmt(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return '0';
  return numberFormatter.format(Number(value));
}

function fmtPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

const cards = computed(() => {
  const o = props.overview;
  if (!o) return [];
  return [
    { label: 'Redis version', value: o.redisVersion },
    { label: 'Mode', value: o.mode },
    { label: 'Uptime', value: formatDuration(o.uptimeSeconds) },
    { label: 'Connected clients', value: fmt(o.connectedClients) },
    { label: 'Used memory', value: o.usedMemoryHuman },
    { label: 'Total keys', value: fmt(o.totalKeys) },
    { label: 'Hit rate', value: fmtPercent(o.hitRate) },
    { label: 'Ops/sec', value: fmt(o.opsPerSec) },
    { label: 'Evicted keys', value: fmt(o.evictedKeys) },
    { label: 'Expired keys', value: fmt(o.expiredKeys) },
    { label: 'Rejected connections', value: fmt(o.rejectedConnections) },
  ];
});
</script>

<template>
  <div class="space-y-4">
    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <div
        v-for="card in cards"
        :key="card.label"
        class="rounded-lg border p-3"
      >
        <p class="text-xs text-muted-foreground">{{ card.label }}</p>
        <p class="mt-1 text-lg font-medium">{{ card.value }}</p>
      </div>
    </div>
  </div>
</template>
