<script setup lang="ts">
import type {
  MongoReplicationInsight,
  MongoTopology,
} from '#shared/types/instance-insights.types';
import {
  InsightKpiCard,
  formatDuration,
} from '~/components/modules/shared/instance-insights-kit';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';

const props = defineProps<{
  replication: MongoReplicationInsight | undefined;
  isInitialLoading?: boolean;
}>();

const TOPOLOGY_LABELS: Record<MongoTopology, string> = {
  standalone: 'Standalone',
  replicaSet: 'Replica set',
  sharded: 'Sharded (mongos)',
};

const STATE_CLASSES: Record<string, string> = {
  PRIMARY: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  SECONDARY: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
  ARBITER: 'bg-muted text-muted-foreground',
};

const maxLagSeconds = computed(() => {
  const lags = (props.replication?.members ?? [])
    .map(member => member.lagSeconds)
    .filter((lag): lag is number => lag !== null);
  return lags.length ? Math.max(...lags) : null;
});

const healthyMembers = computed(
  () =>
    (props.replication?.members ?? []).filter(member => member.health === 1)
      .length
);
</script>

<template>
  <div
    class="relative flex h-full min-h-0 flex-col overflow-y-auto space-y-4 pr-1"
  >
    <LoadingOverlay :visible="!!isInitialLoading" />

    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4 shrink-0">
      <InsightKpiCard
        label="Topology"
        :value="replication ? TOPOLOGY_LABELS[replication.topology] : 'N/A'"
        :show-badge="false"
        icon="hugeicons:hierarchy"
        :subtext="replication?.setName || 'No replica set'"
      />
      <InsightKpiCard
        label="Node role"
        :value="replication?.role?.toUpperCase() || 'UNKNOWN'"
        :show-badge="false"
        icon="hugeicons:cpu"
        :tone="replication?.role === 'primary' ? 'success' : 'info'"
        :subtext="replication?.me || 'Connected node'"
      />
      <InsightKpiCard
        label="Members"
        :value="
          replication?.members.length
            ? `${healthyMembers}/${replication.members.length}`
            : replication?.hosts.length || '-'
        "
        :show-badge="false"
        icon="hugeicons:user-group"
        :tone="
          replication?.members.length &&
          healthyMembers < replication.members.length
            ? 'warning'
            : 'default'
        "
        subtext="Healthy / total members"
      />
      <InsightKpiCard
        label="Max replication lag"
        :value="maxLagSeconds === null ? 'N/A' : `${maxLagSeconds}s`"
        :show-badge="false"
        icon="hugeicons:arrow-data-transfer-horizontal"
        :tone="
          maxLagSeconds !== null && maxLagSeconds > 10 ? 'warning' : 'default'
        "
        :subtext="replication?.primary || 'Primary unknown'"
      />
    </div>

    <BaseNotice
      v-if="replication?.membersError"
      variant="secondary"
      class="shrink-0"
    >
      {{ replication.membersError }}
    </BaseNotice>

    <div
      v-if="replication?.topology === 'replicaSet'"
      class="rounded-lg border bg-card/60 p-3 flex flex-col flex-1 min-h-[200px]"
    >
      <div
        class="flex items-center justify-between pb-2.5 border-b mb-2.5 shrink-0"
      >
        <h3 class="text-xs font-medium">Replica set members</h3>
      </div>

      <div
        class="flex-1 min-h-0 overflow-y-auto rounded-md border bg-background"
      >
        <Table class="text-xs">
          <TableHeader
            class="bg-muted/60 text-muted-foreground sticky top-0 z-10"
          >
            <TableRow>
              <TableHead class="py-1.5 px-2.5 font-medium">Member</TableHead>
              <TableHead class="py-1.5 px-2.5 font-medium text-center"
                >State</TableHead
              >
              <TableHead class="py-1.5 px-2.5 font-medium text-right"
                >Uptime</TableHead
              >
              <TableHead class="py-1.5 px-2.5 font-medium text-right"
                >Ping</TableHead
              >
              <TableHead class="py-1.5 px-2.5 font-medium text-right"
                >Lag</TableHead
              >
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-if="!(replication?.members || []).length"
              class="hover:bg-transparent"
            >
              <TableCell colspan="5" class="py-6">
                <BaseEmpty
                  :desc="
                    replication?.hosts.length
                      ? `Hosts: ${replication.hosts.join(', ')}`
                      : 'No members reported for this replica set.'
                  "
                  hidden-icon
                />
              </TableCell>
            </TableRow>
            <TableRow
              v-for="member in replication?.members || []"
              :key="member.name"
              class="hover:bg-muted/30"
            >
              <TableCell class="py-1.5 px-2.5 font-mono font-medium">
                {{ member.name }}
                <span
                  v-if="member.self"
                  class="ml-1 text-[11px] text-muted-foreground"
                  >(this node)</span
                >
              </TableCell>
              <TableCell class="py-1.5 px-2.5 text-center">
                <Badge
                  variant="outline"
                  class="text-xxs px-1.5 py-0"
                  :class="STATE_CLASSES[member.stateStr] || ''"
                >
                  {{ member.stateStr }}
                </Badge>
              </TableCell>
              <TableCell
                class="py-1.5 px-2.5 text-right font-mono text-muted-foreground"
              >
                {{ formatDuration(member.uptimeSeconds) }}
              </TableCell>
              <TableCell
                class="py-1.5 px-2.5 text-right font-mono text-muted-foreground"
              >
                {{ member.pingMs === null ? '-' : `${member.pingMs}ms` }}
              </TableCell>
              <TableCell
                class="py-1.5 px-2.5 text-right font-mono font-medium text-primary"
              >
                {{ member.lagSeconds === null ? '-' : `${member.lagSeconds}s` }}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>

    <div
      v-else-if="replication"
      class="rounded-lg border bg-card/60 p-6 shrink-0"
    >
      <BaseEmpty
        :desc="
          replication.topology === 'sharded'
            ? 'Connected through mongos. Replica set details live on each shard.'
            : 'This server runs standalone, without replication.'
        "
        hidden-icon
      />
    </div>
  </div>
</template>
