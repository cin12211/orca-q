<script setup lang="ts">
import InsightKpiCard from '~/components/modules/instance-insights/components/InsightKpiCard.vue';
import {
  BrokerSparkline,
  formatMessageRate,
  formatNumber,
} from '~/components/modules/shared/message-broker';
import type { RabbitOverview } from '~/core/types/rabbitmq.types';
import RabbitInsightsSectionTitle from './RabbitInsightsSectionTitle.vue';

defineProps<{
  overview: RabbitOverview | null;
  canManage: boolean;
}>();

const emit = defineEmits<{
  (e: 'open-queues', vhost: string): void;
  (e: 'open-section', section: 'connections' | 'channels'): void;
  (e: 'rename-cluster'): void;
}>();

const churnRows = (overview: RabbitOverview) => [
  {
    label: 'Connections',
    created: overview.churn.connectionCreated,
    closed: overview.churn.connectionClosed,
  },
  {
    label: 'Channels',
    created: overview.churn.channelCreated,
    closed: overview.churn.channelClosed,
  },
  {
    label: 'Queues',
    created: overview.churn.queueCreated,
    closed: overview.churn.queueDeleted,
  },
];
</script>

<template>
  <div class="space-y-3">
    <div class="flex flex-wrap items-center gap-2 text-xs">
      <span class="text-muted-foreground">Cluster</span>
      <span class="font-mono">{{ overview?.clusterName ?? '-' }}</span>
      <Button
        v-if="canManage"
        size="xxs"
        variant="ghost"
        @click="emit('rename-cluster')"
      >
        <Icon name="hugeicons:pencil-edit-02" class="size-3.5!" />
        Rename
      </Button>
      <span class="text-muted-foreground ml-auto">
        Connected as {{ overview?.currentUser.name ?? '-' }}
        <template v-if="overview?.currentUser.tags.length">
          ({{ overview.currentUser.tags.join(', ') }})
        </template>
      </span>
    </div>

    <div class="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <InsightKpiCard
        label="Ready"
        :value="formatNumber(overview?.messages.ready)"
        :show-badge="false"
        icon="hugeicons:inbox"
      />
      <InsightKpiCard
        label="Unacked"
        :value="formatNumber(overview?.messages.unacknowledged)"
        :show-badge="false"
        icon="hugeicons:hourglass"
        :tone="
          (overview?.messages.unacknowledged ?? 0) > 0 ? 'warning' : 'default'
        "
      />
      <InsightKpiCard
        label="Publish"
        :value="formatMessageRate(overview?.rates.publish)"
        :show-badge="false"
        icon="hugeicons:arrow-up-right-01"
      />
      <InsightKpiCard
        label="Deliver"
        :value="formatMessageRate(overview?.rates.deliver)"
        :show-badge="false"
        icon="hugeicons:arrow-down-left-01"
      />
      <InsightKpiCard
        label="Consumers"
        :value="formatNumber(overview?.totals.consumers)"
        :show-badge="false"
        icon="hugeicons:user-multiple"
      />
      <InsightKpiCard
        label="Publisher confirm"
        :value="formatMessageRate(overview?.rates.confirm)"
        :show-badge="false"
        icon="hugeicons:checkmark-circle-02"
      />
      <InsightKpiCard
        label="Ack"
        :value="formatMessageRate(overview?.rates.ack)"
        :show-badge="false"
        icon="hugeicons:tick-double-02"
      />
      <InsightKpiCard
        label="Redelivered"
        :value="formatMessageRate(overview?.rates.redeliver)"
        :show-badge="false"
        icon="hugeicons:repeat"
        :tone="(overview?.rates.redeliver ?? 0) > 0 ? 'warning' : 'default'"
      />
      <InsightKpiCard
        label="Get (empty)"
        :value="`${formatMessageRate(overview?.rates.get)} (${formatMessageRate(overview?.rates.getEmpty)})`"
        :show-badge="false"
        icon="hugeicons:download-04"
      />
      <InsightKpiCard
        label="Unroutable return / drop"
        :value="`${formatMessageRate(overview?.rates.returnUnroutable)} / ${formatMessageRate(overview?.rates.dropUnroutable)}`"
        :show-badge="false"
        icon="hugeicons:alert-02"
        :tone="
          (overview?.rates.dropUnroutable ?? 0) > 0 ? 'warning' : 'default'
        "
      />
    </div>

    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <BrokerSparkline
        label="Ready messages"
        :samples="overview?.samples.ready ?? []"
      />
      <BrokerSparkline
        label="Unacked messages"
        :samples="overview?.samples.unacknowledged ?? []"
      />
      <BrokerSparkline
        label="Publish /s"
        :samples="overview?.samples.publish ?? []"
      />
      <BrokerSparkline
        label="Deliver /s"
        :samples="overview?.samples.deliver ?? []"
      />
    </div>

    <div class="grid gap-3 lg:grid-cols-2">
      <section class="space-y-2 rounded-lg border bg-background p-3">
        <RabbitInsightsSectionTitle title="Global counts" />
        <dl class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <dt class="text-muted-foreground">Connections</dt>
          <dd>
            <button
              type="button"
              class="tabular-nums underline-offset-2 hover:underline cursor-pointer"
              @click="emit('open-section', 'connections')"
            >
              {{ formatNumber(overview?.totals.connections) }}
            </button>
          </dd>
          <dt class="text-muted-foreground">Channels</dt>
          <dd>
            <button
              type="button"
              class="tabular-nums underline-offset-2 hover:underline cursor-pointer"
              @click="emit('open-section', 'channels')"
            >
              {{ formatNumber(overview?.totals.channels) }}
            </button>
          </dd>
          <dt class="text-muted-foreground">Exchanges</dt>
          <dd class="tabular-nums">
            {{ formatNumber(overview?.totals.exchanges) }}
          </dd>
          <dt class="text-muted-foreground">Queues</dt>
          <dd class="tabular-nums">
            {{ formatNumber(overview?.totals.queues) }}
          </dd>
        </dl>
      </section>

      <section class="space-y-2 rounded-lg border bg-background p-3">
        <RabbitInsightsSectionTitle title="Churn statistics (per second)" />
        <dl
          v-if="overview"
          class="grid grid-cols-[auto_1fr_1fr] gap-x-4 gap-y-1 text-xs"
        >
          <dt />
          <dd class="text-muted-foreground">Created</dd>
          <dd class="text-muted-foreground">Closed / deleted</dd>
          <template v-for="row in churnRows(overview)" :key="row.label">
            <dt class="text-muted-foreground">{{ row.label }}</dt>
            <dd class="tabular-nums">{{ formatMessageRate(row.created) }}</dd>
            <dd class="tabular-nums">{{ formatMessageRate(row.closed) }}</dd>
          </template>
        </dl>
      </section>
    </div>

    <section class="space-y-2">
      <RabbitInsightsSectionTitle title="Virtual hosts" />
      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4 text-xs">
        <button
          v-for="vhost in overview?.vhosts ?? []"
          :key="vhost"
          type="button"
          class="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-left hover:bg-muted/40 cursor-pointer"
          @click="emit('open-queues', vhost)"
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
      </div>
    </section>

    <p
      v-if="overview?.ratesMode === 'none'"
      class="text-xs text-muted-foreground"
    >
      Message rates are disabled on this broker (rates_mode = none).
    </p>
  </div>
</template>
