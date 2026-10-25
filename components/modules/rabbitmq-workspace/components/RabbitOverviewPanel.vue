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
  BrokerSparkline,
  formatBytes,
  formatMessageRate,
  formatNumber,
  useAutoRefresh,
  useBrokerRequest,
} from '~/components/modules/message-broker';
import type { Connection } from '~/core/stores';
import { useRabbitTabs } from '../hooks';
import { rabbitmqService } from '../services';

const props = defineProps<{ connection: Connection }>();

const { openQueueList, openConnections } = useRabbitTabs();
const overview = useBrokerRequest(() =>
  rabbitmqService.overview(props.connection)
);
const autoRefresh = ref(true);
useAutoRefresh(overview.load, { enabled: autoRefresh });

const data = computed(() => overview.data.value);
const alarmNodes = computed(
  () =>
    data.value?.nodes.filter(
      node => node.hasMemoryAlarm || node.hasDiskAlarm
    ) ?? []
);
const percent = (used: number, total: number) =>
  total > 0 ? Math.round((used / total) * 100) : undefined;

onMounted(() => overview.load());
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-3">
    <ToolPageHeader
      icon="hugeicons:activity-02"
      title="RabbitMQ Overview"
      :description="
        data
          ? `RabbitMQ ${data.version} · Erlang ${data.erlangVersion} · ${data.clusterName}`
          : 'Broker health, message backlog and throughput'
      "
    >
      <template #actions>
        <div class="flex items-center gap-2 text-xs">
          <Switch
            id="rabbit-overview-auto-refresh"
            v-model:model-value="autoRefresh"
          />
          <label
            for="rabbit-overview-auto-refresh"
            class="cursor-pointer select-none"
          >
            Auto refresh
          </label>
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

    <BaseNotice v-if="overview.error.value" variant="destructive">
      {{ overview.error.value }}
    </BaseNotice>

    <BaseNotice
      v-for="node in alarmNodes"
      :key="node.name"
      variant="destructive"
    >
      Node {{ node.name }} has a
      {{ node.hasMemoryAlarm ? 'memory' : 'disk' }} alarm. Publishers are
      blocked until it clears.
    </BaseNotice>

    <div
      class="relative grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
    >
      <LoadingOverlay :visible="overview.isLoading.value && !data" />
      <InsightKpiCard
        label="Ready"
        :value="formatNumber(data?.messages.ready)"
        :show-badge="false"
        icon="hugeicons:inbox"
      />
      <InsightKpiCard
        label="Unacked"
        :value="formatNumber(data?.messages.unacknowledged)"
        :show-badge="false"
        icon="hugeicons:hourglass"
        :tone="(data?.messages.unacknowledged ?? 0) > 0 ? 'warning' : 'default'"
      />
      <InsightKpiCard
        label="Publish"
        :value="formatMessageRate(data?.rates.publish)"
        :show-badge="false"
        icon="hugeicons:arrow-up-right-01"
      />
      <InsightKpiCard
        label="Deliver"
        :value="formatMessageRate(data?.rates.deliver)"
        :show-badge="false"
        icon="hugeicons:arrow-down-left-01"
      />
      <InsightKpiCard
        label="Consumers"
        :value="formatNumber(data?.totals.consumers)"
        :show-badge="false"
        icon="hugeicons:user-multiple"
      />
    </div>

    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <BrokerSparkline
        label="Ready messages"
        :values="data?.samples.ready.map(item => item.value) ?? []"
      />
      <BrokerSparkline
        label="Unacked messages"
        :values="data?.samples.unacknowledged.map(item => item.value) ?? []"
      />
      <BrokerSparkline
        label="Publish /s"
        :values="data?.samples.publish.map(item => item.value) ?? []"
      />
      <BrokerSparkline
        label="Deliver /s"
        :values="data?.samples.deliver.map(item => item.value) ?? []"
      />
    </div>

    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4 text-xs">
      <button
        v-for="vhost in data?.vhosts ?? []"
        :key="vhost"
        type="button"
        class="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-left hover:bg-muted/40 cursor-pointer"
        @click="openQueueList(vhost)"
      >
        <span class="flex items-center gap-2">
          <Icon
            name="hugeicons:folder-01"
            class="size-4 text-muted-foreground"
          />
          <span class="font-mono">{{ vhost }}</span>
        </span>
        <span class="text-muted-foreground">Open queues</span>
      </button>
      <button
        type="button"
        class="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-left hover:bg-muted/40 cursor-pointer"
        @click="openConnections()"
      >
        <span class="flex items-center gap-2">
          <Icon
            name="hugeicons:plug-socket"
            class="size-4 text-muted-foreground"
          />
          {{ formatNumber(data?.totals.connections) }} connections ·
          {{ formatNumber(data?.totals.channels) }} channels
        </span>
      </button>
    </div>

    <div class="space-y-2">
      <h3
        class="text-xs font-medium uppercase tracking-wider text-muted-foreground"
      >
        Nodes
      </h3>
      <BaseNotice v-if="data?.nodesUnavailableReason" variant="secondary">
        {{ data.nodesUnavailableReason }}
      </BaseNotice>
      <div v-else class="overflow-auto rounded-lg border">
        <Table class="text-xs">
          <TableHeader>
            <TableRow>
              <TableHead>Node</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Memory</TableHead>
              <TableHead>Disk free</TableHead>
              <TableHead>File descriptors</TableHead>
              <TableHead>Processes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="node in data?.nodes ?? []" :key="node.name">
              <TableCell class="font-mono">{{ node.name }}</TableCell>
              <TableCell>
                <span
                  :class="node.isRunning ? 'text-emerald-500' : 'text-rose-500'"
                >
                  {{ node.isRunning ? 'Running' : 'Down' }}
                </span>
              </TableCell>
              <TableCell :class="node.hasMemoryAlarm && 'text-rose-500'">
                {{ formatBytes(node.memoryUsed) }} /
                {{ formatBytes(node.memoryLimit) }} ({{
                  percent(node.memoryUsed, node.memoryLimit)
                }}%)
              </TableCell>
              <TableCell :class="node.hasDiskAlarm && 'text-rose-500'">
                {{ formatBytes(node.diskFree) }} (limit
                {{ formatBytes(node.diskFreeLimit) }})
              </TableCell>
              <TableCell>
                {{ node.fileDescriptorsUsed ?? '-' }} /
                {{ node.fileDescriptorsTotal ?? '-' }}
              </TableCell>
              <TableCell>
                {{ formatNumber(node.processesUsed) }} /
                {{ formatNumber(node.processesTotal) }}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>

    <p v-if="data?.ratesMode === 'none'" class="text-xs text-muted-foreground">
      Message rates are disabled on this broker (rates_mode = none).
    </p>
  </div>
</template>
