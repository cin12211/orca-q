<script setup lang="ts">
import type { RedisReplicationInsight } from '~/core/types/instance-insights.types';

defineProps<{
  replication: RedisReplicationInsight | undefined;
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
        <p class="text-xs text-muted-foreground">Role</p>
        <p class="mt-1 text-lg font-medium">
          {{ replication?.role || 'unknown' }}
        </p>
      </div>
      <div class="rounded-lg border p-3">
        <p class="text-xs text-muted-foreground">Connected replicas</p>
        <p class="mt-1 text-lg font-medium">
          {{ fmt(replication?.connectedReplicas) }}
        </p>
      </div>
      <div class="rounded-lg border p-3">
        <p class="text-xs text-muted-foreground">Master link status</p>
        <p class="mt-1 text-lg font-medium">
          {{ replication?.masterLinkStatus || 'n/a' }}
        </p>
      </div>
      <div class="rounded-lg border p-3">
        <p class="text-xs text-muted-foreground">Cluster state</p>
        <p class="mt-1 text-lg font-medium">
          {{
            replication?.clusterState ||
            (replication?.clusterEnabled ? 'enabled' : 'disabled')
          }}
        </p>
      </div>
    </div>

    <div class="rounded-lg border p-3 text-sm text-muted-foreground space-y-1">
      <p>Replication lag: {{ replication?.replicationLag ?? 'n/a' }}</p>
      <p>Sentinel masters: {{ replication?.sentinelMasters ?? 'n/a' }}</p>
      <p>
        Cluster slots assigned:
        {{ replication?.clusterSlotsAssigned ?? 'n/a' }}
      </p>
      <p>Cluster known nodes: {{ replication?.clusterKnownNodes ?? 'n/a' }}</p>
    </div>

    <div class="rounded-lg border p-3">
      <h3 class="text-sm font-medium">Replicas</h3>
      <div class="mt-3 space-y-2 text-xs">
        <div
          v-if="!(replication?.replicas || []).length"
          class="text-muted-foreground"
        >
          No replica nodes reported.
        </div>
        <div
          v-for="replica in replication?.replicas || []"
          :key="replica.id"
          class="flex items-center justify-between rounded-md bg-muted/20 px-3 py-2"
        >
          <span>{{ replica.addr }}</span>
          <span class="text-muted-foreground">
            {{ replica.state }} · lag {{ replica.lag ?? 'n/a' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
