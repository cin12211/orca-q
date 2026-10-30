<script setup lang="ts">
import InsightKpiCard from '~/components/modules/instance-insights/components/InsightKpiCard.vue';
import {
  BrokerKeyValueTable,
  formatMessageRate,
  useAutoRefresh,
  useBrokerRequest,
} from '~/components/modules/shared/message-broker';
import type { Connection } from '~/core/stores';
import { RABBIT_DEFAULT_EXCHANGE_LABEL, RABBIT_TAB_ICONS } from '../constants';
import { useRabbitTabs } from '../hooks';
import { rabbitmqService } from '../services';
import RabbitBindingsTable from './RabbitBindingsTable.vue';
import RabbitPublishDialog from './RabbitPublishDialog.vue';

const props = defineProps<{
  connection: Connection;
  vhost: string;
  exchangeName: string;
}>();

const { openExchange, openQueue } = useRabbitTabs();
const exchange = useBrokerRequest(() =>
  rabbitmqService.exchange(props.connection, props.vhost, props.exchangeName)
);
useAutoRefresh(exchange.load);

const isPublishOpen = ref(false);
const data = computed(() => exchange.data.value);

onMounted(() => exchange.load());
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-3">
    <ToolPageHeader
      :icon="RABBIT_TAB_ICONS.exchange"
      :title="exchangeName || RABBIT_DEFAULT_EXCHANGE_LABEL"
    >
      <template #context>
        <span class="font-mono">vhost {{ vhost }}</span>
        <template v-if="data">
          <Badge variant="outline">{{ data.type }}</Badge>
          <Badge v-if="data.isDurable" variant="outline">durable</Badge>
          <Badge v-if="data.isInternal" variant="outline">internal</Badge>
        </template>
      </template>
      <template #actions>
        <Button
          size="xxs"
          variant="outline"
          :disabled="data?.isInternal"
          @click="isPublishOpen = true"
        >
          <Icon name="hugeicons:sent" class="size-3.5!" />
          Publish
        </Button>
        <Button
          size="xxs"
          variant="outline"
          :disabled="exchange.isLoading.value"
          @click="exchange.load()"
        >
          <Icon name="hugeicons:redo" class="size-3.5!" />
          Refresh
        </Button>
      </template>
    </ToolPageHeader>

    <BaseNotice v-if="exchange.error.value" variant="destructive">{{
      exchange.error.value
    }}</BaseNotice>

    <div class="relative grid gap-3 md:grid-cols-2">
      <LoadingOverlay :visible="exchange.isLoading.value && !data" />
      <InsightKpiCard
        label="Publish in"
        :value="formatMessageRate(data?.publishInRate)"
        :show-badge="false"
        icon="hugeicons:arrow-down-left-01"
      />
      <InsightKpiCard
        label="Publish out"
        :value="formatMessageRate(data?.publishOutRate)"
        :show-badge="false"
        icon="hugeicons:arrow-up-right-01"
      />
    </div>

    <section class="space-y-2 rounded-lg border bg-background p-3">
      <h3
        class="text-xs font-medium uppercase tracking-wider text-muted-foreground"
      >
        Arguments
      </h3>
      <BrokerKeyValueTable :entries="data?.arguments ?? {}" />
    </section>

    <section class="space-y-2">
      <h3
        class="text-xs font-medium uppercase tracking-wider text-muted-foreground"
      >
        Routes to
      </h3>
      <RabbitBindingsTable
        :bindings="data?.bindingsAsSource ?? []"
        show="destination"
        @open-queue="openQueue(vhost, $event)"
        @open-exchange="openExchange(vhost, $event)"
      />
    </section>

    <section class="space-y-2">
      <h3
        class="text-xs font-medium uppercase tracking-wider text-muted-foreground"
      >
        Receives from
      </h3>
      <RabbitBindingsTable
        :bindings="data?.bindingsAsDestination ?? []"
        show="source"
        @open-exchange="openExchange(vhost, $event)"
      />
    </section>

    <RabbitPublishDialog
      v-model:open="isPublishOpen"
      :connection="connection"
      :vhost="vhost"
      :exchange="exchangeName"
    />
  </div>
</template>
