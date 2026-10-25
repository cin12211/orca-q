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
  formatNumber,
  useBrokerRequest,
} from '~/components/modules/message-broker';
import type { Connection } from '~/core/stores';
import { useKafkaTabs } from '../hooks';
import { kafkaService } from '../services';

const props = defineProps<{ connection: Connection }>();

type SortKey = 'name' | 'messageCount' | 'sizeBytes' | 'partitionCount';

const { openTopic } = useKafkaTabs();
const topics = useBrokerRequest(() => kafkaService.topics(props.connection));
const search = ref('');
const sortKey = ref<SortKey>('name');

const rows = computed(() =>
  (topics.data.value ?? [])
    .filter(topic =>
      topic.name.toLowerCase().includes(search.value.toLowerCase())
    )
    .sort((left, right) =>
      sortKey.value === 'name'
        ? left.name.localeCompare(right.name)
        : (right[sortKey.value] ?? 0) - (left[sortKey.value] ?? 0)
    )
);

onMounted(() => topics.load());
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-3 p-3">
    <ToolPageHeader icon="hugeicons:list-view" title="Topics">
      <template #actions>
        <Input
          v-model="search"
          placeholder="Filter by name"
          class="h-7 w-48 text-xs"
        />
        <Button
          size="xxs"
          variant="outline"
          :disabled="topics.isLoading.value"
          @click="topics.load()"
        >
          <Icon name="hugeicons:redo" class="size-3.5!" />
          Refresh
        </Button>
      </template>
    </ToolPageHeader>

    <BaseNotice v-if="topics.error.value" variant="destructive">{{
      topics.error.value
    }}</BaseNotice>

    <div class="relative min-h-0 flex-1 overflow-auto rounded-lg border">
      <LoadingOverlay :visible="topics.isLoading.value && !topics.data.value" />
      <Table class="text-xs">
        <TableHeader class="sticky top-0 z-10 bg-background">
          <TableRow>
            <TableHead class="cursor-pointer" @click="sortKey = 'name'"
              >Topic</TableHead
            >
            <TableHead
              class="cursor-pointer text-right"
              @click="sortKey = 'partitionCount'"
              >Partitions</TableHead
            >
            <TableHead class="text-right">Replication</TableHead>
            <TableHead
              class="cursor-pointer text-right"
              @click="sortKey = 'messageCount'"
              >Messages</TableHead
            >
            <TableHead
              class="cursor-pointer text-right"
              @click="sortKey = 'sizeBytes'"
              >Size</TableHead
            >
            <TableHead>Health</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="topic in rows"
            :key="topic.name"
            class="cursor-pointer"
            @click="openTopic(topic.name)"
          >
            <TableCell class="font-mono">{{ topic.name }}</TableCell>
            <TableCell class="text-right tabular-nums">{{
              topic.partitionCount
            }}</TableCell>
            <TableCell class="text-right tabular-nums">{{
              topic.replicationFactor
            }}</TableCell>
            <TableCell class="text-right tabular-nums">{{
              formatNumber(topic.messageCount)
            }}</TableCell>
            <TableCell class="text-right tabular-nums">
              {{
                topic.sizeBytes === null ? '-' : formatBytes(topic.sizeBytes)
              }}
            </TableCell>
            <TableCell>
              <span v-if="topic.offlinePartitions" class="text-rose-500">
                {{ topic.offlinePartitions }} offline
              </span>
              <span
                v-else-if="topic.underReplicatedPartitions"
                class="text-amber-500"
              >
                {{ topic.underReplicatedPartitions }} under-replicated
              </span>
              <span v-else class="text-emerald-500">OK</span>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <BaseEmpty
        v-if="topics.data.value && !rows.length"
        title="No topics"
        desc="No topic matches this filter."
        icon="hugeicons:message-multiple-01"
      />
    </div>
  </div>
</template>
