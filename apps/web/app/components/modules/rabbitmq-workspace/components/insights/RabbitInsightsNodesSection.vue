<script setup lang="ts">
import {
  formatBytes,
  formatNumber,
  formatSeconds,
} from '~/components/modules/shared/message-broker';
import type { RabbitNode, RabbitOverview } from '~/core/types/rabbitmq.types';
import RabbitInsightsTable from './RabbitInsightsTable.vue';

const props = defineProps<{ overview: RabbitOverview | null }>();

const MS_PER_SECOND = 1000;

const columns = [
  { key: 'name', label: 'Node' },
  { key: 'status', label: 'Status' },
  { key: 'memory', label: 'Memory' },
  { key: 'disk', label: 'Disk free' },
  { key: 'fd', label: 'File descriptors' },
  { key: 'processes', label: 'Erlang processes' },
  { key: 'cores', label: 'Cores' },
  { key: 'runQueue', label: 'Run queue' },
  { key: 'uptime', label: 'Uptime' },
];

const percent = (used: number, total: number) =>
  total > 0 ? `${Math.round((used / total) * 100)}%` : '-';

const rows = computed(() =>
  (props.overview?.nodes ?? []).map(node => ({ ...node, key: node.name }))
);
const asNode = (row: Record<string, unknown>) => row as unknown as RabbitNode;
</script>

<template>
  <div class="space-y-3">
    <BaseNotice v-if="overview?.nodesUnavailableReason" variant="secondary">
      {{ overview.nodesUnavailableReason }}
    </BaseNotice>
    <RabbitInsightsTable
      v-else
      :columns="columns"
      :rows="rows"
      row-key="key"
      empty-text="No node data yet."
    >
      <template #cell-name="{ row }">
        <span class="font-mono">{{ asNode(row).name }}</span>
        <span class="ml-1 text-muted-foreground">({{ asNode(row).type }})</span>
      </template>
      <template #cell-status="{ row }">
        <span
          :class="asNode(row).isRunning ? 'text-emerald-500' : 'text-rose-500'"
        >
          {{ asNode(row).isRunning ? 'Running' : 'Down' }}
        </span>
        <Badge v-if="asNode(row).hasMemoryAlarm" variant="destructive">
          memory alarm
        </Badge>
        <Badge v-if="asNode(row).hasDiskAlarm" variant="destructive">
          disk alarm
        </Badge>
      </template>
      <template #cell-memory="{ row }">
        {{ formatBytes(asNode(row).memoryUsed) }} /
        {{ formatBytes(asNode(row).memoryLimit) }} ({{
          percent(asNode(row).memoryUsed, asNode(row).memoryLimit)
        }})
      </template>
      <template #cell-disk="{ row }">
        {{ formatBytes(asNode(row).diskFree) }} (limit
        {{ formatBytes(asNode(row).diskFreeLimit) }})
      </template>
      <template #cell-fd="{ row }">
        {{ asNode(row).fileDescriptorsUsed ?? '-' }} /
        {{ asNode(row).fileDescriptorsTotal ?? '-' }}
      </template>
      <template #cell-processes="{ row }">
        {{ formatNumber(asNode(row).processesUsed) }} /
        {{ formatNumber(asNode(row).processesTotal) }}
      </template>
      <template #cell-cores="{ row }">
        {{ asNode(row).cores ?? '-' }}
      </template>
      <template #cell-runQueue="{ row }">
        {{ asNode(row).runQueue ?? '-' }}
      </template>
      <template #cell-uptime="{ row }">
        {{ formatSeconds(asNode(row).uptimeMs / MS_PER_SECOND) }}
      </template>
    </RabbitInsightsTable>
    <p class="text-xs text-muted-foreground">
      Publishers are blocked while a node has a memory or disk alarm.
    </p>
  </div>
</template>
