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
  BrokerKeyValueTable,
  BrokerSparkline,
  estimateDrainSeconds,
  formatMessageRate,
  formatNumber,
  formatRatio,
  formatSeconds,
  useAutoRefresh,
  useBrokerRequest,
} from '~/components/modules/shared/message-broker';
import type { Connection } from '~/core/stores';
import { RABBIT_TAB_ICONS } from '../constants';
import { useRabbitTabs } from '../hooks';
import { rabbitmqService } from '../services';
import RabbitBindingsTable from './RabbitBindingsTable.vue';
import RabbitPublishDialog from './RabbitPublishDialog.vue';
import RabbitQueueMessages from './RabbitQueueMessages.vue';

const props = defineProps<{
  connection: Connection;
  vhost: string;
  queueName: string;
}>();

const { openExchange } = useRabbitTabs();
const queue = useBrokerRequest(() =>
  rabbitmqService.queue(props.connection, props.vhost, props.queueName)
);
useAutoRefresh(queue.load);

const activeTab = ref('overview');
const isPublishOpen = ref(false);
const data = computed(() => queue.data.value);

const drainText = computed(() => {
  if (!data.value) return '-';
  const seconds = estimateDrainSeconds({
    backlog: data.value.messagesReady,
    deliverRate: data.value.rates.deliver,
    publishRate: data.value.rates.publish,
  });
  if (seconds === null) return 'Not draining';
  return seconds === 0 ? 'Empty' : formatSeconds(seconds);
});
const hasBacklogWithoutConsumers = computed(
  () => (data.value?.messagesReady ?? 0) > 0 && data.value?.consumers === 0
);
onMounted(() => queue.load());
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-3 overflow-hidden p-3">
    <ToolPageHeader :icon="RABBIT_TAB_ICONS.queue" :title="queueName">
      <template #context>
        <span class="font-mono">vhost {{ vhost }}</span>
        <template v-if="data">
          <Badge variant="outline">{{ data.type }}</Badge>
          <Badge variant="outline">{{ data.state }}</Badge>
          <Badge v-if="data.isDurable" variant="outline">durable</Badge>
          <Badge v-if="data.policy" variant="outline"
            >policy: {{ data.policy }}</Badge
          >
        </template>
      </template>
      <template #actions>
        <Button size="xxs" variant="outline" @click="isPublishOpen = true">
          <Icon name="hugeicons:sent" class="size-3.5!" />
          Publish
        </Button>
        <Button
          size="xxs"
          variant="outline"
          :disabled="queue.isLoading.value"
          @click="queue.load()"
        >
          <Icon name="hugeicons:redo" class="size-3.5!" />
          Refresh
        </Button>
      </template>
    </ToolPageHeader>

    <BaseNotice v-if="queue.error.value" variant="destructive">{{
      queue.error.value
    }}</BaseNotice>
    <BaseNotice v-if="hasBacklogWithoutConsumers" variant="destructive">
      Messages are waiting but no consumer is attached to this queue.
    </BaseNotice>

    <Tabs
      v-model="activeTab"
      class="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden"
    >
      <TabsList size="sm" class="justify-start! shrink-0">
        <TabsTrigger size="xs" value="overview" class="cursor-pointer"
          >Overview</TabsTrigger
        >
        <TabsTrigger size="xs" value="messages" class="cursor-pointer"
          >Messages</TabsTrigger
        >
      </TabsList>

      <TabsContent
        value="overview"
        class="mt-0 min-h-0 flex-1 overflow-y-auto space-y-3 data-[state=inactive]:hidden"
      >
        <div class="relative grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <LoadingOverlay :visible="queue.isLoading.value && !data" />
          <InsightKpiCard
            label="Ready"
            :value="formatNumber(data?.messagesReady)"
            :show-badge="false"
            icon="hugeicons:inbox"
          />
          <InsightKpiCard
            label="Unacked"
            :value="formatNumber(data?.messagesUnacknowledged)"
            :show-badge="false"
            icon="hugeicons:hourglass"
          />
          <InsightKpiCard
            label="Consumers"
            :value="formatNumber(data?.consumers)"
            :subtext="`Utilisation ${formatRatio(data?.consumerUtilisation)}`"
            :tone="hasBacklogWithoutConsumers ? 'danger' : 'default'"
            :show-badge="false"
            icon="hugeicons:user-multiple"
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
            label="Backlog clears in"
            :value="drainText"
            info-tooltip="Ready messages divided by (deliver rate - publish rate)."
            :show-badge="false"
            icon="hugeicons:clock-01"
          />
        </div>

        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <BrokerSparkline label="Ready" :samples="data?.samples.ready ?? []" />
          <BrokerSparkline
            label="Unacked"
            :samples="data?.samples.unacknowledged ?? []"
          />
          <BrokerSparkline
            label="Publish /s"
            :samples="data?.samples.publish ?? []"
          />
          <BrokerSparkline
            label="Deliver /s"
            :samples="data?.samples.deliver ?? []"
          />
        </div>

        <div class="grid gap-3 lg:grid-cols-2">
          <section class="space-y-2 rounded-lg border bg-background p-3">
            <h3
              class="text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              Arguments
            </h3>
            <BrokerKeyValueTable :entries="data?.arguments ?? {}" />
          </section>
          <section class="space-y-2 rounded-lg border bg-background p-3">
            <h3
              class="text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              Effective policy
            </h3>
            <BrokerKeyValueTable
              :entries="data?.effectivePolicy ?? {}"
              empty-text="No policy applies"
            />
          </section>
        </div>

        <section class="space-y-2">
          <h3
            class="text-xs font-medium uppercase tracking-wider text-muted-foreground"
          >
            Bindings
          </h3>
          <RabbitBindingsTable
            :bindings="data?.bindings ?? []"
            show="source"
            @open-exchange="openExchange(vhost, $event)"
          />
        </section>

        <section class="space-y-2">
          <h3
            class="text-xs font-medium uppercase tracking-wider text-muted-foreground"
          >
            Consumers
          </h3>
          <p
            v-if="!data?.consumerDetails.length"
            class="text-xs text-muted-foreground"
          >
            No consumers
          </p>
          <div v-else class="overflow-auto rounded-lg border">
            <Table class="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead>Consumer tag</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Prefetch</TableHead>
                  <TableHead>Ack mode</TableHead>
                  <TableHead>Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="consumer in data.consumerDetails"
                  :key="consumer.consumerTag"
                >
                  <TableCell class="font-mono">{{
                    consumer.consumerTag
                  }}</TableCell>
                  <TableCell class="font-mono">{{
                    consumer.connectionName ?? consumer.peerHost ?? '-'
                  }}</TableCell>
                  <TableCell
                    :class="consumer.prefetchCount === 0 && 'text-amber-500'"
                  >
                    {{
                      consumer.prefetchCount === 0
                        ? 'Unlimited'
                        : consumer.prefetchCount
                    }}
                  </TableCell>
                  <TableCell>{{
                    consumer.isAckRequired ? 'Manual ack' : 'Auto ack'
                  }}</TableCell>
                  <TableCell>{{ consumer.isActive ? 'Yes' : 'No' }}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </section>
      </TabsContent>

      <TabsContent
        value="messages"
        class="mt-0 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden"
      >
        <RabbitQueueMessages
          :connection="connection"
          :vhost="vhost"
          :queue-name="queueName"
        />
      </TabsContent>
    </Tabs>

    <RabbitPublishDialog
      v-model:open="isPublishOpen"
      :connection="connection"
      :vhost="vhost"
      exchange=""
      :default-routing-key="queueName"
    />
  </div>
</template>
