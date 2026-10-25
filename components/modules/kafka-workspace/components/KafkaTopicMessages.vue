<script setup lang="ts">
import {
  BrokerMessageDetail,
  BrokerMessageTable,
  getBrokerErrorMessage,
  previewBrokerPayload,
} from '~/components/modules/message-broker';
import { useCopyToClipboard } from '~/core/composables/useCopyToClipboard';
import type { Connection } from '~/core/stores';
import type { BrokerMessage } from '~/core/types/broker-message.types';
import type {
  KafkaMessageStart,
  KafkaPartitionCursor,
} from '~/core/types/kafka.types';
import { KAFKA_PAGE_SIZE_OPTIONS, KAFKA_START_OPTIONS } from '../constants';
import { kafkaService } from '../services';

const ALL_PARTITIONS = 'all';

const props = defineProps<{
  connection: Connection;
  topicName: string;
  partitionCount: number;
}>();

const { copied, handleCopy } = useCopyToClipboard();
const partition = ref<string>(ALL_PARTITIONS);
const start = ref<KafkaMessageStart>('latest');
const offset = ref('0');
const fromTime = ref('');
const limit = ref<number>(KAFKA_PAGE_SIZE_OPTIONS[1]);
const search = ref('');
const messages = ref<BrokerMessage[]>([]);
const selected = ref<BrokerMessage | null>(null);
const nextCursors = ref<KafkaPartitionCursor[]>([]);
const hasMore = ref(false);
const isLoading = ref(false);
const error = ref<string | null>(null);

const partitions = computed(() =>
  partition.value === ALL_PARTITIONS ? undefined : [Number(partition.value)]
);
const visibleMessages = computed(() => {
  const term = search.value.trim().toLowerCase();
  if (!term) return messages.value;

  return messages.value.filter(message =>
    `${message.key ?? ''} ${previewBrokerPayload(message, Number.MAX_SAFE_INTEGER)} ${JSON.stringify(message.headers)}`
      .toLowerCase()
      .includes(term)
  );
});

const load = async (options: { append: boolean }) => {
  isLoading.value = true;
  error.value = null;

  try {
    const page = await kafkaService.messages(props.connection, {
      topic: props.topicName,
      partitions: partitions.value,
      start: start.value,
      offset: start.value === 'offset' ? offset.value : undefined,
      timestamp:
        start.value === 'timestamp' && fromTime.value
          ? new Date(fromTime.value).getTime()
          : undefined,
      limit: limit.value,
      cursors: options.append ? nextCursors.value : undefined,
    });

    messages.value = options.append
      ? [...messages.value, ...page.messages]
      : page.messages;
    nextCursors.value = page.nextCursors;
    hasMore.value = page.hasMore;
    if (!options.append) selected.value = messages.value[0] ?? null;
  } catch (cause) {
    error.value = getBrokerErrorMessage(cause);
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => load({ append: false }));
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-2">
    <form
      class="flex flex-wrap items-end gap-2 text-xs"
      @submit.prevent="load({ append: false })"
    >
      <div class="space-y-1">
        <Label for="kafka-msg-partition">Partition</Label>
        <Select v-model="partition">
          <SelectTrigger id="kafka-msg-partition" size="sm" class="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem :value="ALL_PARTITIONS">All</SelectItem>
            <SelectItem
              v-for="index in partitionCount"
              :key="index"
              :value="String(index - 1)"
            >
              {{ index - 1 }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="space-y-1">
        <Label for="kafka-msg-start">Start</Label>
        <Select v-model="start">
          <SelectTrigger id="kafka-msg-start" size="sm" class="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="option in KAFKA_START_OPTIONS"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div v-if="start === 'offset'" class="space-y-1">
        <Label for="kafka-msg-offset">Offset</Label>
        <Input
          id="kafka-msg-offset"
          v-model="offset"
          class="h-8 w-28 font-mono text-xs"
          inputmode="numeric"
        />
      </div>
      <div v-if="start === 'timestamp'" class="space-y-1">
        <Label for="kafka-msg-time">Time</Label>
        <Input
          id="kafka-msg-time"
          v-model="fromTime"
          type="datetime-local"
          class="h-8 w-52 text-xs"
        />
      </div>
      <div class="space-y-1">
        <Label for="kafka-msg-limit">Limit</Label>
        <Select v-model="limit">
          <SelectTrigger id="kafka-msg-limit" size="sm" class="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="option in KAFKA_PAGE_SIZE_OPTIONS"
              :key="option"
              :value="option"
            >
              {{ option }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" size="sm" :disabled="isLoading">
        <Icon
          v-if="isLoading"
          name="hugeicons:loading-03"
          class="size-4 animate-spin"
        />
        Load
      </Button>
      <Input
        v-model="search"
        placeholder="Find in loaded messages"
        class="h-8 w-56 text-xs ml-auto"
      />
      <Button
        v-if="messages.length"
        type="button"
        size="sm"
        variant="outline"
        @click="handleCopy(JSON.stringify(visibleMessages, null, 2))"
      >
        <Icon
          :name="copied ? 'hugeicons:tick-02' : 'hugeicons:copy-01'"
          class="size-4"
        />
        Copy as JSON
      </Button>
    </form>

    <BaseNotice v-if="error" variant="destructive">{{ error }}</BaseNotice>

    <BaseEmpty
      v-if="!isLoading && !messages.length && !error"
      title="No messages"
      desc="Nothing was found from this starting point."
      icon="hugeicons:message-multiple-01"
    />

    <div
      v-else
      class="grid min-h-0 flex-1 gap-2 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
    >
      <div class="flex min-h-0 flex-col gap-2">
        <BrokerMessageTable
          :messages="visibleMessages"
          :selected-id="selected?.id ?? null"
          variant="kafka"
          @select="selected = $event"
        />
        <Button
          v-if="hasMore"
          size="xxs"
          variant="outline"
          class="self-center"
          :disabled="isLoading"
          @click="load({ append: true })"
        >
          Load more
        </Button>
      </div>
      <BrokerMessageDetail
        v-if="selected"
        :message="selected"
        @close="selected = null"
      />
    </div>
  </div>
</template>
