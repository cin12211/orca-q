<script setup lang="ts">
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  formatBytes,
  formatMessageRate,
  formatNumber,
  formatRatio,
  useAutoRefresh,
  useBrokerRequest,
} from '~/components/modules/message-broker';
import type { Connection } from '~/core/stores';
import type { RabbitQueueSummary } from '~/core/types/rabbitmq.types';
import { RABBIT_QUEUE_PAGE_SIZE } from '../constants';
import { useRabbitTabs } from '../hooks';
import { rabbitmqService } from '../services';

const props = defineProps<{ connection: Connection; vhost: string }>();

type SortKey =
  | 'name'
  | 'messagesReady'
  | 'messagesUnacknowledged'
  | 'consumers';

const { openQueue } = useRabbitTabs();
const search = ref('');
const page = ref(1);
const sortKey = ref<SortKey>('messagesReady');
const isOnlyProblems = ref(false);

const queues = useBrokerRequest(() =>
  rabbitmqService.queues(props.connection, {
    vhost: props.vhost,
    page: page.value,
    pageSize: RABBIT_QUEUE_PAGE_SIZE,
    search: search.value,
  })
);
useAutoRefresh(queues.load);

const isStuck = (queue: RabbitQueueSummary) =>
  queue.messagesReady > 0 && queue.consumers === 0;

const rows = computed(() => {
  const items = [...(queues.data.value?.items ?? [])].filter(
    queue => !isOnlyProblems.value || isStuck(queue)
  );

  return items.sort((left, right) =>
    sortKey.value === 'name'
      ? left.name.localeCompare(right.name)
      : right[sortKey.value] - left[sortKey.value]
  );
});
const pageCount = computed(() => queues.data.value?.pageCount ?? 1);

watch(search, () => {
  page.value = 1;
  void queues.load();
});
watch(page, () => queues.load());
onMounted(() => queues.load());
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-3 p-3">
    <ToolPageHeader icon="hugeicons:list-view" :title="`Queues in ${vhost}`">
      <template #actions>
        <Input
          v-model.lazy="search"
          placeholder="Filter by name"
          class="h-7 w-48 text-xs"
        />
        <div class="flex items-center gap-2 text-xs">
          <Switch
            id="rabbit-queue-problems"
            v-model:model-value="isOnlyProblems"
          />
          <label for="rabbit-queue-problems" class="cursor-pointer"
            >Only stuck queues</label
          >
        </div>
        <Button
          size="xxs"
          variant="outline"
          :disabled="queues.isLoading.value"
          @click="queues.load()"
        >
          <Icon name="hugeicons:redo" class="size-3.5!" />
          Refresh
        </Button>
      </template>
    </ToolPageHeader>

    <BaseNotice v-if="queues.error.value" variant="destructive">{{
      queues.error.value
    }}</BaseNotice>

    <div class="relative min-h-0 flex-1 overflow-auto rounded-lg border">
      <LoadingOverlay :visible="queues.isLoading.value && !queues.data.value" />
      <Table class="text-xs">
        <TableHeader class="sticky top-0 z-10 bg-background">
          <TableRow>
            <TableHead class="cursor-pointer" @click="sortKey = 'name'"
              >Name</TableHead
            >
            <TableHead>Type</TableHead>
            <TableHead>State</TableHead>
            <TableHead
              class="cursor-pointer text-right"
              @click="sortKey = 'messagesReady'"
              >Ready</TableHead
            >
            <TableHead
              class="cursor-pointer text-right"
              @click="sortKey = 'messagesUnacknowledged'"
              >Unacked</TableHead
            >
            <TableHead
              class="cursor-pointer text-right"
              @click="sortKey = 'consumers'"
              >Consumers</TableHead
            >
            <TableHead class="text-right">Utilisation</TableHead>
            <TableHead class="text-right">In</TableHead>
            <TableHead class="text-right">Out</TableHead>
            <TableHead class="text-right">Memory</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="queue in rows"
            :key="queue.name"
            class="cursor-pointer"
            @click="openQueue(vhost, queue.name)"
          >
            <TableCell class="font-mono">
              <span class="flex items-center gap-1.5">
                <span
                  v-if="isStuck(queue)"
                  class="size-2 rounded-full bg-rose-500"
                  title="Messages waiting, no consumer"
                />
                {{ queue.name }}
              </span>
            </TableCell>
            <TableCell>{{ queue.type }}</TableCell>
            <TableCell>{{ queue.state }}</TableCell>
            <TableCell class="text-right tabular-nums">{{
              formatNumber(queue.messagesReady)
            }}</TableCell>
            <TableCell class="text-right tabular-nums">{{
              formatNumber(queue.messagesUnacknowledged)
            }}</TableCell>
            <TableCell class="text-right tabular-nums">{{
              queue.consumers
            }}</TableCell>
            <TableCell class="text-right tabular-nums">{{
              formatRatio(queue.consumerUtilisation)
            }}</TableCell>
            <TableCell class="text-right tabular-nums">{{
              formatMessageRate(queue.rates.publish)
            }}</TableCell>
            <TableCell class="text-right tabular-nums">{{
              formatMessageRate(queue.rates.deliver)
            }}</TableCell>
            <TableCell class="text-right tabular-nums">{{
              queue.memory === null ? '-' : formatBytes(queue.memory)
            }}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <BaseEmpty
        v-if="queues.data.value && !rows.length"
        title="No queues"
        desc="No queue matches this filter."
        icon="hugeicons:inbox"
      />
    </div>

    <div
      v-if="pageCount > 1"
      class="flex items-center justify-end gap-2 text-xs"
    >
      <Button size="xxs" variant="outline" :disabled="page <= 1" @click="page--"
        >Previous</Button
      >
      <span>Page {{ page }} / {{ pageCount }}</span>
      <Button
        size="xxs"
        variant="outline"
        :disabled="page >= pageCount"
        @click="page++"
        >Next</Button
      >
    </div>
  </div>
</template>
