<script setup lang="ts">
import {
  formatNumber,
  useAutoRefresh,
  useBrokerRequest,
} from '~/components/modules/message-broker';
import {
  isBuiltInRabbitExchange,
  rabbitmqService,
  useRabbitTabs,
} from '~/components/modules/rabbitmq-workspace';
import { useWorkspaceConnectionRoute } from '~/core/composables/useWorkspaceConnectionRoute';
import { useManagementConnectionStore } from '~/core/stores';
import { ManagementSidebarHeader } from '../shared';

const SIDEBAR_QUEUE_LIMIT = 500;

const connectionStore = useManagementConnectionStore();
const { workspaceId } = useWorkspaceConnectionRoute();
const { openQueue, openExchange, openQueueList } = useRabbitTabs();
const connection = computed(() => connectionStore.selectedConnection);

const vhost = ref('/');
const searchQuery = ref('');

const vhosts = useBrokerRequest(async () =>
  connection.value ? rabbitmqService.vhosts(connection.value) : []
);
const queues = useBrokerRequest(async () =>
  connection.value
    ? rabbitmqService.queues(connection.value, {
        vhost: vhost.value,
        pageSize: SIDEBAR_QUEUE_LIMIT,
      })
    : null
);
const exchanges = useBrokerRequest(async () =>
  connection.value
    ? rabbitmqService.exchanges(connection.value, vhost.value)
    : []
);

const loadAll = async (options: { silent: boolean } = { silent: false }) => {
  await Promise.all([queues.load(options), exchanges.load(options)]);
};
useAutoRefresh(loadAll);

const matches = (name: string) =>
  name.toLowerCase().includes(searchQuery.value.trim().toLowerCase());
const filteredQueues = computed(() =>
  (queues.data.value?.items ?? []).filter(queue => matches(queue.name))
);
const filteredExchanges = computed(() =>
  (exchanges.data.value ?? []).filter(
    exchange =>
      !isBuiltInRabbitExchange(exchange.name) && matches(exchange.name)
  )
);
const error = computed(
  () => vhosts.error.value || queues.error.value || exchanges.error.value
);

watch(
  () => connection.value?.id,
  async () => {
    vhost.value = connection.value?.broker?.rabbitmq?.vhost || '/';
    await vhosts.load();
    await loadAll();
  },
  { immediate: true }
);
watch(vhost, () => loadAll());
</script>

<template>
  <div class="flex flex-col h-full w-full overflow-hidden">
    <ManagementSidebarHeader
      v-model:search="searchQuery"
      title="RabbitMQ"
      :show-connection="true"
      :workspace-id="workspaceId"
      :show-search="true"
      search-placeholder="Filter queues and exchanges..."
    >
      <template #details>
        <p class="text-sm leading-none block pb-1 pt-1">Virtual host</p>
        <Select v-model="vhost">
          <SelectTrigger size="sm" class="w-full font-mono text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="item in vhosts.data.value ?? [vhost]"
              :key="item"
              :value="item"
            >
              {{ item }}
            </SelectItem>
          </SelectContent>
        </Select>
      </template>
      <template #actions>
        <Tooltip>
          <TooltipTrigger as-child>
            <Button size="iconSm" variant="ghost" @click="loadAll()">
              <Icon
                name="hugeicons:redo"
                :class="[
                  'size-4! min-w-4',
                  queues.isLoading.value && 'animate-spin',
                ]"
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Refresh</TooltipContent>
        </Tooltip>
      </template>
    </ManagementSidebarHeader>

    <div
      class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-2 pb-3 pt-2 text-xs"
    >
      <BaseNotice v-if="error" variant="destructive">{{ error }}</BaseNotice>

      <section class="space-y-1">
        <div class="flex items-center justify-between px-1">
          <h3
            class="font-medium uppercase tracking-wider text-muted-foreground"
          >
            Queues ({{ formatNumber(queues.data.value?.totalCount) }})
          </h3>
          <button
            type="button"
            class="text-primary hover:underline cursor-pointer"
            @click="openQueueList(vhost)"
          >
            View all
          </button>
        </div>
        <button
          v-for="queue in filteredQueues"
          :key="queue.name"
          type="button"
          class="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-muted/60 cursor-pointer"
          @click="openQueue(vhost, queue.name)"
        >
          <Icon
            name="hugeicons:inbox"
            class="size-3.5 shrink-0 text-orange-500"
          />
          <span class="truncate font-mono flex-1">{{ queue.name }}</span>
          <span
            v-if="queue.messagesReady > 0 && queue.consumers === 0"
            class="size-2 rounded-full bg-rose-500 shrink-0"
            title="Messages waiting, no consumer"
          />
          <span class="tabular-nums text-muted-foreground">{{
            formatNumber(queue.messagesReady)
          }}</span>
        </button>
        <p
          v-if="queues.data.value && !filteredQueues.length"
          class="px-2 text-muted-foreground"
        >
          No queues
        </p>
      </section>

      <section class="space-y-1">
        <h3
          class="px-1 font-medium uppercase tracking-wider text-muted-foreground"
        >
          Exchanges ({{ filteredExchanges.length }})
        </h3>
        <button
          v-for="exchange in filteredExchanges"
          :key="exchange.name"
          type="button"
          class="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-muted/60 cursor-pointer"
          @click="openExchange(vhost, exchange.name)"
        >
          <Icon
            name="hugeicons:arrow-data-transfer-horizontal"
            class="size-3.5 shrink-0 text-orange-500"
          />
          <span class="truncate font-mono flex-1">{{ exchange.name }}</span>
          <span class="text-muted-foreground">{{ exchange.type }}</span>
        </button>
        <p
          v-if="exchanges.data.value && !filteredExchanges.length"
          class="px-2 text-muted-foreground"
        >
          No custom exchanges
        </p>
      </section>
    </div>
  </div>
</template>
