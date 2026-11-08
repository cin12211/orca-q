<script setup lang="ts">
import type { MongoOverviewInsight } from '#shared/types/instance-insights.types';
import {
  InsightKpiCard,
  formatBytes,
  formatDuration,
  formatNumber,
  formatRate,
} from '~/components/modules/shared/instance-insights-kit';
import type { MongoOpcounterRates } from '../../utils';

const props = defineProps<{
  overview: MongoOverviewInsight | undefined;
  opcounterRates: MongoOpcounterRates | null;
  isInitialLoading?: boolean;
}>();

const OPERATION_LABELS: { key: keyof MongoOpcounterRates; label: string }[] = [
  { key: 'query', label: 'Query' },
  { key: 'insert', label: 'Insert' },
  { key: 'update', label: 'Update' },
  { key: 'delete', label: 'Delete' },
  { key: 'getmore', label: 'Getmore' },
  { key: 'command', label: 'Command' },
];

const connectionUsage = computed(() => {
  const connections = props.overview?.connections;
  if (!connections) return undefined;
  const capacity = connections.current + connections.available;
  return capacity > 0 ? (connections.current / capacity) * 100 : undefined;
});

const residentMemory = computed(() => {
  const residentMb = props.overview?.memory?.residentMb;
  return residentMb === null || residentMb === undefined
    ? 'N/A'
    : formatBytes(residentMb * 1024 * 1024);
});

const opsPerSecond = computed(() =>
  props.opcounterRates ? formatRate(props.opcounterRates.total) : '…'
);
</script>

<template>
  <div
    class="relative flex h-full min-h-0 flex-col overflow-y-auto space-y-4 pr-1"
  >
    <LoadingOverlay :visible="!!isInitialLoading" />

    <BaseNotice
      v-if="overview?.serverStatusError"
      variant="secondary"
      class="shrink-0"
    >
      {{ overview.serverStatusError }}
    </BaseNotice>

    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4 shrink-0">
      <InsightKpiCard
        label="Version"
        :value="overview?.version || 'N/A'"
        :show-badge="false"
        icon="hugeicons:server-stack-01"
        :subtext="
          [overview?.process, overview?.storageEngine]
            .filter(Boolean)
            .join(' · ') || 'MongoDB server'
        "
      />
      <InsightKpiCard
        label="Uptime"
        :value="formatDuration(overview?.uptimeSeconds)"
        :show-badge="false"
        icon="hugeicons:clock-01"
        :subtext="overview?.host || 'Host unknown'"
      />
      <InsightKpiCard
        label="Connections"
        :value="formatNumber(overview?.connections?.current)"
        :show-badge="false"
        icon="hugeicons:plug-socket"
        :progress="connectionUsage"
        :tone="
          connectionUsage !== undefined && connectionUsage > 80
            ? 'warning'
            : 'default'
        "
        :subtext="`${formatNumber(overview?.connections?.available)} available`"
      />
      <InsightKpiCard
        label="Operations"
        :value="opsPerSecond"
        :show-badge="false"
        icon="hugeicons:dashboard-speed-01"
        :subtext="`Resident memory ${residentMemory}`"
      />
    </div>

    <div class="rounded-lg border bg-card/60 p-3 shrink-0">
      <div class="flex items-center justify-between pb-2.5 border-b mb-2.5">
        <h3 class="text-xs font-medium">Operations per second</h3>
        <span class="text-[11px] text-muted-foreground">
          Since last refresh
        </span>
      </div>

      <div class="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6 text-xs">
        <div
          v-for="operation in OPERATION_LABELS"
          :key="operation.key"
          class="rounded-lg bg-background p-2.5 border"
        >
          <p class="text-muted-foreground text-[11px]">{{ operation.label }}</p>
          <p class="font-mono font-medium mt-0.5 text-foreground">
            {{
              opcounterRates ? formatRate(opcounterRates[operation.key]) : '…'
            }}
          </p>
        </div>
      </div>
    </div>

    <div class="rounded-lg border bg-card/60 p-3 shrink-0">
      <div class="flex items-center justify-between pb-2.5 border-b mb-2.5">
        <h3 class="text-xs font-medium">Network</h3>
      </div>

      <div class="grid gap-3 md:grid-cols-3 text-xs">
        <div class="rounded-lg bg-background p-2.5 border">
          <p class="text-muted-foreground text-[11px]">Bytes in</p>
          <p class="font-mono font-medium mt-0.5 text-foreground">
            {{ formatBytes(overview?.network?.bytesIn) }}
          </p>
        </div>
        <div class="rounded-lg bg-background p-2.5 border">
          <p class="text-muted-foreground text-[11px]">Bytes out</p>
          <p class="font-mono font-medium mt-0.5 text-foreground">
            {{ formatBytes(overview?.network?.bytesOut) }}
          </p>
        </div>
        <div class="rounded-lg bg-background p-2.5 border">
          <p class="text-muted-foreground text-[11px]">Requests</p>
          <p class="font-mono font-medium mt-0.5 text-foreground">
            {{ formatNumber(overview?.network?.numRequests) }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
