<script setup lang="ts">
import type {
  RedisKeyspaceInsight,
  RedisOverviewMetrics,
} from '~/core/types/instance-insights.types';
import { formatDuration } from '../utils/formatters';
import InsightKpiCard from './InsightKpiCard.vue';

const props = defineProps<{
  overview: RedisOverviewMetrics | undefined;
  keyspace?: RedisKeyspaceInsight | undefined;
  dbIndex?: number;
  isInitialLoading?: boolean;
}>();

const numberFormatter = new Intl.NumberFormat();

function fmt(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return '0';
  return numberFormatter.format(Number(value));
}

function fmtPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

const selectedDbKeyCount = computed(() => {
  if (!props.keyspace?.databases) return 0;
  const targetDb = `db${props.dbIndex ?? 0}`;
  const found = props.keyspace.databases.find(
    d => d.database.toLowerCase() === targetDb
  );
  return found ? found.keyCount : 0;
});

const memoryDisplayValue = computed(() => {
  if (!props.overview) return '-';
  const { usedMemoryHuman, maxmemory, maxmemoryHuman, totalSystemMemoryHuman } =
    props.overview;
  if (maxmemory && maxmemory > 0 && maxmemoryHuman) {
    return `${usedMemoryHuman} / ${maxmemoryHuman}`;
  }
  if (totalSystemMemoryHuman) {
    return `${usedMemoryHuman} / ${totalSystemMemoryHuman}`;
  }
  return `${usedMemoryHuman} / Unlimited`;
});

const memoryInfoTooltip = computed(() => {
  if (!props.overview) return undefined;
  const { totalSystemMemoryHuman, maxmemoryHuman, maxmemoryPolicy } =
    props.overview;
  return {
    systemMemory: totalSystemMemoryHuman || 'N/A',
    maxMemory: maxmemoryHuman || 'Unlimited',
    maxMemoryPolicy: maxmemoryPolicy || 'noeviction',
  };
});

const memoryProgress = computed(() => {
  if (!props.overview) return undefined;
  const { usedMemory, maxmemory, totalSystemMemory } = props.overview;
  if (maxmemory && maxmemory > 0) {
    return Math.round((usedMemory / maxmemory) * 100);
  }
  if (totalSystemMemory && totalSystemMemory > 0) {
    return Math.round((usedMemory / totalSystemMemory) * 100);
  }
  return undefined;
});

const memorySubtext = computed(() => {
  if (!props.overview) return undefined;
  const { usedMemory, maxmemory, totalSystemMemory } = props.overview;
  if (maxmemory && maxmemory > 0) {
    const pct = ((usedMemory / maxmemory) * 100).toFixed(1);
    return `${pct}% of Max Memory limit`;
  }
  if (totalSystemMemory && totalSystemMemory > 0) {
    const pct = ((usedMemory / totalSystemMemory) * 100).toFixed(1);
    return `${pct}% of System RAM`;
  }
  return undefined;
});
</script>

<template>
  <div
    class="relative flex h-full min-h-0 flex-col overflow-y-auto space-y-4 pr-1"
  >
    <LoadingOverlay :visible="!!isInitialLoading" />
    <!-- Server Overview Group -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <h3
          class="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
        >
          <Icon
            name="hugeicons:globe-02"
            class="size-3.5 shrink-0 text-muted-foreground"
          />
          <span>Instance Overview</span>
        </h3>
      </div>

      <div class="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <InsightKpiCard
          label="Redis version"
          :value="overview?.redisVersion || '-'"
          :show-badge="false"
          icon="hugeicons:database"
        />
        <InsightKpiCard
          label="Server Mode"
          :value="overview?.mode || '-'"
          :show-badge="false"
          icon="hugeicons:cpu"
        />
        <InsightKpiCard
          label="Uptime"
          :value="overview ? formatDuration(overview.uptimeSeconds) : '-'"
          :show-badge="false"
          icon="hugeicons:activity-02"
        />
        <InsightKpiCard
          label="Used memory"
          :value="memoryDisplayValue"
          :show-badge="false"
          icon="hugeicons:database"
          :progress="memoryProgress"
          :subtext="memorySubtext"
          :info-tooltip="memoryInfoTooltip"
        />
        <InsightKpiCard
          label="Connected clients"
          :value="fmt(overview?.connectedClients)"
          :show-badge="false"
          icon="hugeicons:user-group"
        />
        <InsightKpiCard
          label="Ops/sec"
          :value="fmt(overview?.opsPerSec)"
          :show-badge="false"
          icon="hugeicons:flash"
        />
        <InsightKpiCard
          label="Hit rate"
          :value="overview ? fmtPercent(overview.hitRate) : '0%'"
          :show-badge="false"
          :progress="overview ? overview.hitRate * 100 : 0"
          :tone="overview && overview.hitRate > 0.8 ? 'success' : 'warning'"
        />
        <InsightKpiCard
          label="Rejected connections"
          :value="fmt(overview?.rejectedConnections)"
          :show-badge="false"
          :tone="
            overview && overview.rejectedConnections > 0 ? 'danger' : 'default'
          "
        />
        <InsightKpiCard
          label="Total Instance Keys"
          :value="fmt(overview?.totalKeys)"
          :show-badge="false"
          icon="hugeicons:database"
          subtext="Total keys across all databases"
        />
        <InsightKpiCard
          label="Expired keys"
          :value="fmt(overview?.expiredKeys)"
          :show-badge="false"
          icon="hugeicons:activity-02"
          subtext="Total keys naturally expired"
        />
        <InsightKpiCard
          label="Evicted keys"
          :value="fmt(overview?.evictedKeys)"
          :show-badge="false"
          :tone="overview && overview.evictedKeys > 0 ? 'warning' : 'default'"
          subtext="Evicted under maxmemory policy"
        />
      </div>
    </div>

    <!-- Database Summary Group -->
    <div class="space-y-2 pt-2 border-t">
      <div class="flex items-center justify-between">
        <h3
          class="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
        >
          <Icon
            name="hugeicons:target-02"
            class="size-3.5 shrink-0 text-muted-foreground"
          />
          <span>Database Keyspace Summary (DB /{{ dbIndex ?? 0 }})</span>
        </h3>
      </div>

      <div class="grid gap-3 md:grid-cols-3">
        <InsightKpiCard
          label="Keys in selected DB"
          :value="fmt(selectedDbKeyCount)"
          :show-badge="false"
          icon="hugeicons:database-sync-01"
          :subtext="`Total keys stored in DB /${dbIndex ?? 0}`"
        />
      </div>
    </div>
  </div>
</template>
