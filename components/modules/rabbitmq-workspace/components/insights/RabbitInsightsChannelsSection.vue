<script setup lang="ts">
import {
  formatMessageRate,
  formatNumber,
  useBrokerRequest,
} from '~/components/modules/shared/message-broker';
import type { Connection } from '~/core/stores';
import type { RabbitChannelSummary } from '~/core/types/rabbitmq.types';
import { useRabbitInsightsRefresh } from '../../hooks';
import { rabbitmqService } from '../../services';
import RabbitInsightsTable from './RabbitInsightsTable.vue';

const props = defineProps<{
  connection: Connection;
  refreshKey: number;
  intervalMs: number;
}>();

const snapshot = useBrokerRequest(() =>
  rabbitmqService.connections(props.connection)
);
useRabbitInsightsRefresh(snapshot.load, {
  refreshKey: toRef(props, 'refreshKey'),
  intervalMs: toRef(props, 'intervalMs'),
});

const columns = [
  { key: 'name', label: 'Channel' },
  { key: 'user', label: 'User' },
  { key: 'vhost', label: 'Virtual host' },
  { key: 'mode', label: 'Mode' },
  { key: 'state', label: 'State' },
  { key: 'prefetch', label: 'Prefetch' },
  { key: 'unacked', label: 'Unacked' },
  { key: 'unconfirmed', label: 'Unconfirmed' },
  {
    key: 'uncommitted',
    label: 'Uncommitted msgs / acks',
    title: 'Only for transactional channels',
  },
  { key: 'consumers', label: 'Consumers' },
  { key: 'publish', label: 'Publish / confirm' },
  { key: 'deliver', label: 'Deliver / ack' },
  {
    key: 'unroutable',
    label: 'Unroutable return / drop',
    title: 'Messages that matched no queue',
  },
];

const rows = computed(() =>
  (snapshot.data.value?.channels ?? []).map(item => ({ ...item }))
);
const asChannel = (row: Record<string, unknown>) =>
  row as unknown as RabbitChannelSummary;

onMounted(() => snapshot.load());
</script>

<template>
  <div class="space-y-3">
    <BaseNotice v-if="snapshot.error.value" variant="destructive">
      {{ snapshot.error.value }}
    </BaseNotice>
    <div class="relative">
      <LoadingOverlay
        :visible="snapshot.isLoading.value && !snapshot.data.value"
      />
      <RabbitInsightsTable
        :columns="columns"
        :rows="rows"
        row-key="name"
        empty-text="No channel is open right now."
      >
        <template #cell-name="{ row }">
          <span class="block max-w-56 truncate" :title="asChannel(row).name">
            {{ asChannel(row).name }}
          </span>
        </template>
        <template #cell-mode="{ row }">
          <Badge variant="outline">{{ asChannel(row).mode }}</Badge>
        </template>
        <template #cell-prefetch="{ row }">
          {{ asChannel(row).prefetchCount || 'unlimited' }}
        </template>
        <template #cell-unacked="{ row }">
          {{ formatNumber(asChannel(row).messagesUnacknowledged) }}
        </template>
        <template #cell-unconfirmed="{ row }">
          {{ formatNumber(asChannel(row).messagesUnconfirmed) }}
        </template>
        <template #cell-uncommitted="{ row }">
          {{ asChannel(row).messagesUncommitted }} /
          {{ asChannel(row).acksUncommitted }}
        </template>
        <template #cell-consumers="{ row }">
          {{ asChannel(row).consumerCount }}
        </template>
        <template #cell-publish="{ row }">
          {{ formatMessageRate(asChannel(row).rates.publish) }} /
          {{ formatMessageRate(asChannel(row).rates.confirm) }}
        </template>
        <template #cell-deliver="{ row }">
          {{ formatMessageRate(asChannel(row).rates.deliver) }} /
          {{ formatMessageRate(asChannel(row).rates.ack) }}
        </template>
        <template #cell-unroutable="{ row }">
          {{ formatMessageRate(asChannel(row).rates.returnUnroutable) }} /
          {{ formatMessageRate(asChannel(row).rates.dropUnroutable) }}
        </template>
      </RabbitInsightsTable>
    </div>
  </div>
</template>
