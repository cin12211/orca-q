<script setup lang="ts">
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import InsightKpiCard from '~/components/modules/instance-insights/components/InsightKpiCard.vue';
import {
  formatBytes,
  formatNumber,
  useAutoRefresh,
  useBrokerRequest,
} from '~/components/modules/message-broker';
import type { Connection } from '~/core/stores';
import { kafkaService } from '../services';

const props = defineProps<{ connection: Connection }>();

const overview = useBrokerRequest(() =>
  kafkaService.overview(props.connection)
);
const autoRefresh = ref(false);
useAutoRefresh(overview.load, { enabled: autoRefresh });

const data = computed(() => overview.data.value);

onMounted(() => overview.load());
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-3">
    <ToolPageHeader
      icon="hugeicons:activity-02"
      title="Kafka Cluster"
      :description="
        data
          ? `Cluster ${data.clusterId}`
          : 'Brokers, topics and replication health'
      "
    >
      <template #actions>
        <div class="flex items-center gap-2 text-xs">
          <Switch
            id="kafka-overview-auto-refresh"
            v-model:model-value="autoRefresh"
          />
          <label
            for="kafka-overview-auto-refresh"
            class="cursor-pointer select-none"
            >Auto refresh</label
          >
        </div>
        <Button
          size="xxs"
          variant="outline"
          :disabled="overview.isLoading.value"
          @click="overview.load()"
        >
          <Icon name="hugeicons:redo" class="size-3.5!" />
          Refresh
        </Button>
      </template>
    </ToolPageHeader>

    <BaseNotice v-if="overview.error.value" variant="destructive">{{
      overview.error.value
    }}</BaseNotice>
    <BaseNotice v-if="(data?.offlinePartitions ?? 0) > 0" variant="destructive">
      {{ data?.offlinePartitions }} partitions have no leader. Producers and
      consumers of those partitions are stuck.
    </BaseNotice>

    <div class="relative grid gap-3 md:grid-cols-3 xl:grid-cols-6">
      <LoadingOverlay :visible="overview.isLoading.value && !data" />
      <InsightKpiCard
        label="Brokers"
        :value="formatNumber(data?.brokers.length)"
        :show-badge="false"
        icon="hugeicons:server-stack-01"
      />
      <InsightKpiCard
        label="Topics"
        :value="formatNumber(data?.topicCount)"
        :subtext="`${formatNumber(data?.internalTopicCount)} internal`"
        :show-badge="false"
        icon="hugeicons:message-multiple-01"
      />
      <InsightKpiCard
        label="Partitions"
        :value="formatNumber(data?.partitionCount)"
        :show-badge="false"
        icon="hugeicons:layers-01"
      />
      <InsightKpiCard
        label="Under-replicated"
        :value="formatNumber(data?.underReplicatedPartitions)"
        :tone="
          (data?.underReplicatedPartitions ?? 0) > 0 ? 'warning' : 'success'
        "
        :show-badge="false"
        icon="hugeicons:copy-01"
      />
      <InsightKpiCard
        label="Offline partitions"
        :value="formatNumber(data?.offlinePartitions)"
        :tone="(data?.offlinePartitions ?? 0) > 0 ? 'danger' : 'success'"
        :show-badge="false"
        icon="hugeicons:alert-02"
      />
      <InsightKpiCard
        label="Consumer groups"
        :value="formatNumber(data?.consumerGroupCount)"
        :show-badge="false"
        icon="hugeicons:user-multiple"
      />
    </div>

    <section class="space-y-2">
      <h3
        class="text-xs font-medium uppercase tracking-wider text-muted-foreground"
      >
        Brokers
      </h3>
      <div class="overflow-auto rounded-lg border">
        <Table class="text-xs">
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Host</TableHead>
              <TableHead>Rack</TableHead>
              <TableHead>Role</TableHead>
              <TableHead class="text-right">Data on disk</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="broker in data?.brokers ?? []" :key="broker.id">
              <TableCell class="tabular-nums">{{ broker.id }}</TableCell>
              <TableCell class="font-mono"
                >{{ broker.host }}:{{ broker.port }}</TableCell
              >
              <TableCell>{{ broker.rack ?? '-' }}</TableCell>
              <TableCell>{{
                broker.isController ? 'Controller' : 'Broker'
              }}</TableCell>
              <TableCell class="text-right tabular-nums">
                {{
                  broker.logDirBytes === null
                    ? 'No permission'
                    : formatBytes(broker.logDirBytes)
                }}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </section>
  </div>
</template>
