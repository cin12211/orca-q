<script setup lang="ts">
import type { RabbitOverview } from '~/core/types/rabbitmq.types';
import RabbitInsightsSectionTitle from './RabbitInsightsSectionTitle.vue';
import RabbitInsightsTable from './RabbitInsightsTable.vue';

const props = defineProps<{ overview: RabbitOverview | null }>();

const listenerColumns = [
  { key: 'protocol', label: 'Protocol' },
  { key: 'node', label: 'Node' },
  { key: 'ipAddress', label: 'Bound to' },
  { key: 'port', label: 'Port' },
  { key: 'tls', label: 'TLS' },
];
const contextColumns = [
  { key: 'description', label: 'Context' },
  { key: 'path', label: 'Path' },
  { key: 'port', label: 'Port' },
  { key: 'tls', label: 'TLS' },
];

const listeners = computed(() =>
  (props.overview?.listeners ?? []).map(item => ({
    ...item,
    key: `${item.node}:${item.protocol}:${item.port}`,
    tls: item.isTls ? 'Yes' : 'No',
  }))
);
const contexts = computed(() =>
  (props.overview?.contexts ?? []).map(item => ({
    ...item,
    key: `${item.description}:${item.port}`,
    tls: item.isTls ? 'Yes' : 'No',
  }))
);
</script>

<template>
  <div class="space-y-4">
    <section class="space-y-2">
      <RabbitInsightsSectionTitle title="Listening ports" />
      <RabbitInsightsTable
        :columns="listenerColumns"
        :rows="listeners"
        row-key="key"
        empty-text="No listeners reported."
      />
    </section>
    <section class="space-y-2">
      <RabbitInsightsSectionTitle title="Web contexts" />
      <RabbitInsightsTable
        :columns="contextColumns"
        :rows="contexts"
        row-key="key"
        empty-text="No web contexts reported."
      />
    </section>
  </div>
</template>
