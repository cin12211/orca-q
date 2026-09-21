<script setup lang="ts">
import InsightKpiCard from '~/components/modules/driver/shared/instance-insights/components/InsightKpiCard.vue';
import {
  formatBytes,
  formatDuration,
  formatNumber,
} from '~/components/modules/driver/shared/instance-insights/utils/formatters';
import type {
  MongoOverviewInsight,
  MongoTopology,
} from '~/core/types/instance-insights.types';
import MongoInsightsWarnings from './MongoInsightsWarnings.vue';

const props = defineProps<{
  overview: MongoOverviewInsight | undefined;
  isInitialLoading?: boolean;
}>();

const BYTES_PER_MB = 1024 * 1024;
const PERCENT = 100;

const TOPOLOGY_LABELS: Record<MongoTopology, string> = {
  standalone: 'Standalone',
  replicaSet: 'Replica set',
  sharded: 'Sharded (mongos)',
};

const percentOf = (part: number, total: number) =>
  total > 0 ? (part / total) * PERCENT : 0;

const topologyLabel = computed(() => {
  if (!props.overview) return '-';
  const label = TOPOLOGY_LABELS[props.overview.topology];
  return props.overview.replicaSetName
    ? `${label} (${props.overview.replicaSetName})`
    : label;
});

const connectionsUsage = computed(() => {
  const connections = props.overview?.connections;
  if (!connections) return undefined;
  return percentOf(
    connections.current,
    connections.current + connections.available
  );
});

const cacheUsage = computed(() => {
  const cache = props.overview?.cache;
  return cache ? percentOf(cache.usedBytes, cache.maxBytes) : undefined;
});
</script>

<template>
  <div class="relative flex h-full min-h-0 flex-col gap-3 overflow-y-auto">
    <LoadingOverlay :visible="!!isInitialLoading" />
    <MongoInsightsWarnings :warnings="overview?.warnings" />

    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <InsightKpiCard
        label="Version"
        :value="overview?.version || '-'"
        :subtext="overview?.storageEngine ?? undefined"
        icon="hugeicons:package"
        :show-badge="false"
      />
      <InsightKpiCard
        label="Uptime"
        :value="formatDuration(overview?.uptimeSeconds)"
        :subtext="overview?.host"
        icon="hugeicons:clock-01"
        :show-badge="false"
      />
      <InsightKpiCard
        label="Topology"
        :value="topologyLabel"
        icon="hugeicons:hierarchy"
        :show-badge="false"
      />
      <InsightKpiCard
        label="Connections"
        :value="formatNumber(overview?.connections?.current)"
        :subtext="
          overview?.connections
            ? `${formatNumber(overview.connections.available)} available · ${formatNumber(overview.connections.totalCreated)} created`
            : 'Unavailable'
        "
        :progress="connectionsUsage"
        icon="hugeicons:user-group"
        :show-badge="false"
      />
    </div>

    <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
      <InsightKpiCard
        label="Resident memory"
        :value="
          overview?.memory
            ? formatBytes(overview.memory.residentMb * BYTES_PER_MB)
            : '-'
        "
        :subtext="
          overview?.memory
            ? `Virtual ${formatBytes(overview.memory.virtualMb * BYTES_PER_MB)}`
            : 'Unavailable'
        "
        icon="hugeicons:cpu"
        :show-badge="false"
      />
      <InsightKpiCard
        label="WiredTiger cache"
        :value="overview?.cache ? formatBytes(overview.cache.usedBytes) : '-'"
        :subtext="
          overview?.cache
            ? `of ${formatBytes(overview.cache.maxBytes)} · ${formatBytes(overview.cache.dirtyBytes)} dirty`
            : 'Unavailable'
        "
        :progress="cacheUsage"
        icon="hugeicons:database"
        :show-badge="false"
      />
    </div>
  </div>
</template>
