<script setup lang="ts">
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import type { RedisReplicationInsight } from '~/core/types/instance-insights.types';
import InsightKpiCard from './InsightKpiCard.vue';

defineProps<{
  replication: RedisReplicationInsight | undefined;
  dbIndex?: number;
}>();

const numberFormatter = new Intl.NumberFormat();

function fmt(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return '0';
  return numberFormatter.format(Number(value));
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col overflow-y-auto space-y-4 pr-1">
    <div class="flex items-center justify-between shrink-0">
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

    <!-- Top Replication KPI Cards -->
    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4 shrink-0">
      <InsightKpiCard
        label="Node Role"
        :value="replication?.role?.toUpperCase() || 'UNKNOWN'"
        :show-badge="false"
        icon="hugeicons:cpu"
        :tone="replication?.role === 'master' ? 'success' : 'info'"
        subtext="Redis cluster node role"
      />
      <InsightKpiCard
        label="Connected Replicas"
        :value="fmt(replication?.connectedReplicas)"
        :show-badge="false"
        icon="hugeicons:user-group"
        subtext="Active slave nodes connected"
      />
      <InsightKpiCard
        label="Master link status"
        :value="replication?.masterLinkStatus || 'n/a'"
        :show-badge="false"
        :tone="replication?.masterLinkStatus === 'up' ? 'success' : 'default'"
        subtext="Link state to master node"
      />
      <InsightKpiCard
        label="Cluster state"
        :value="
          replication?.clusterState ||
          (replication?.clusterEnabled ? 'enabled' : 'disabled')
        "
        :show-badge="false"
        :tone="replication?.clusterState === 'ok' ? 'success' : 'default'"
        subtext="Redis Cluster mode state"
      />
    </div>

    <!-- Cluster / Sentinel Details Bar -->
    <div class="rounded-lg border bg-card/60 p-3 shrink-0">
      <div class="flex items-center justify-between pb-2.5 border-b mb-2.5">
        <h3 class="text-xs font-medium">Cluster & Sentinel Configuration</h3>
      </div>

      <div class="grid gap-3 md:grid-cols-4 text-xs">
        <div class="rounded-lg bg-background p-2.5 border">
          <p class="text-muted-foreground text-[11px]">Replication Lag</p>
          <p class="font-mono font-medium mt-0.5 text-foreground">
            {{
              replication?.replicationLag !== null &&
              replication?.replicationLag !== undefined
                ? `${replication.replicationLag}s`
                : 'N/A'
            }}
          </p>
        </div>
        <div class="rounded-lg bg-background p-2.5 border">
          <p class="text-muted-foreground text-[11px]">Sentinel Masters</p>
          <p class="font-mono font-medium mt-0.5 text-foreground">
            {{ replication?.sentinelMasters ?? 'N/A' }}
          </p>
        </div>
        <div class="rounded-lg bg-background p-2.5 border">
          <p class="text-muted-foreground text-[11px]">
            Cluster Slots Assigned
          </p>
          <p class="font-mono font-medium mt-0.5 text-foreground">
            {{ replication?.clusterSlotsAssigned ?? 'N/A' }}
          </p>
        </div>
        <div class="rounded-lg bg-background p-2.5 border">
          <p class="text-muted-foreground text-[11px]">Cluster Known Nodes</p>
          <p class="font-mono font-medium mt-0.5 text-foreground">
            {{ replication?.clusterKnownNodes ?? 'N/A' }}
          </p>
        </div>
      </div>
    </div>

    <!-- Replica Nodes Data Table -->
    <div
      class="rounded-lg border bg-card/60 p-3 flex flex-col flex-1 min-h-[200px]"
    >
      <div
        class="flex items-center justify-between pb-2.5 border-b mb-2.5 shrink-0"
      >
        <h3 class="text-xs font-medium">Replica Nodes List</h3>
      </div>

      <div
        class="flex-1 min-h-0 overflow-y-auto rounded-md border bg-background"
      >
        <Table class="text-xs">
          <TableHeader
            class="bg-muted/60 text-muted-foreground sticky top-0 z-10"
          >
            <TableRow>
              <TableHead class="py-1.5 px-2.5 font-medium"
                >Replica Address</TableHead
              >
              <TableHead class="py-1.5 px-2.5 font-medium text-center"
                >State</TableHead
              >
              <TableHead class="py-1.5 px-2.5 font-medium text-right"
                >Offset</TableHead
              >
              <TableHead class="py-1.5 px-2.5 font-medium text-right"
                >Replication Lag</TableHead
              >
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-if="!(replication?.replicas || []).length"
              class="hover:bg-transparent"
            >
              <TableCell colspan="4" class="py-6">
                <BaseEmpty
                  desc="No replica nodes reported for this instance."
                  hidden-icon
                />
              </TableCell>
            </TableRow>
            <TableRow
              v-for="replica in replication?.replicas || []"
              :key="replica.id"
              class="hover:bg-muted/30"
            >
              <TableCell class="py-1.5 px-2.5 font-mono font-medium">{{
                replica.addr
              }}</TableCell>
              <TableCell class="py-1.5 px-2.5 text-center">
                <Badge
                  variant="outline"
                  class="text-xxs px-1.5 py-0"
                  :class="
                    replica.state === 'online'
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                      : ''
                  "
                >
                  {{ replica.state }}
                </Badge>
              </TableCell>
              <TableCell
                class="py-1.5 px-2.5 text-right font-mono text-muted-foreground"
              >
                {{ replica.offset || '-' }}
              </TableCell>
              <TableCell
                class="py-1.5 px-2.5 text-right font-mono font-medium text-primary"
              >
                {{
                  replica.lag !== null && replica.lag !== undefined
                    ? `${replica.lag}s`
                    : 'N/A'
                }}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  </div>
</template>
