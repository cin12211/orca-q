<script setup lang="ts">
import {
  BrokerMessageDetail,
  BrokerMessageTable,
  getBrokerErrorMessage,
} from '~/components/modules/message-broker';
import { useCopyToClipboard } from '~/core/composables/useCopyToClipboard';
import type { Connection } from '~/core/stores';
import type { BrokerMessage } from '~/core/types/broker-message.types';
import { RABBIT_PEEK_COUNT_OPTIONS } from '../constants';
import { rabbitmqService } from '../services';

const props = defineProps<{
  connection: Connection;
  vhost: string;
  queueName: string;
}>();

const { copied, handleCopy } = useCopyToClipboard();
const count = ref<number>(RABBIT_PEEK_COUNT_OPTIONS[1]);
const messages = ref<BrokerMessage[]>([]);
const selected = ref<BrokerMessage | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);
const hasLoaded = ref(false);

const peek = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    messages.value = await rabbitmqService.peek(
      props.connection,
      props.vhost,
      props.queueName,
      count.value
    );
    selected.value = messages.value[0] ?? null;
    hasLoaded.value = true;
  } catch (cause) {
    error.value = getBrokerErrorMessage(cause);
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-2">
    <BaseNotice variant="secondary">
      Peeking takes messages from the front of the queue and puts them back
      right away (like "Get messages" with requeue in the Management UI). They
      are not lost, but are marked as redelivered and may change order.
    </BaseNotice>

    <div class="flex flex-wrap items-center gap-2 text-xs">
      <Label for="rabbit-peek-count">Messages</Label>
      <Select v-model="count">
        <SelectTrigger id="rabbit-peek-count" size="sm" class="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="option in RABBIT_PEEK_COUNT_OPTIONS"
            :key="option"
            :value="option"
          >
            {{ option }}
          </SelectItem>
        </SelectContent>
      </Select>
      <Button size="xxs" :disabled="isLoading" @click="peek">
        <Icon
          :name="isLoading ? 'hugeicons:loading-03' : 'hugeicons:view'"
          :class="['size-3.5!', isLoading && 'animate-spin']"
        />
        Peek messages
      </Button>
      <Button
        v-if="messages.length"
        size="xxs"
        variant="outline"
        @click="handleCopy(JSON.stringify(messages, null, 2))"
      >
        <Icon
          :name="copied ? 'hugeicons:tick-02' : 'hugeicons:copy-01'"
          class="size-3.5!"
        />
        Copy as JSON
      </Button>
    </div>

    <BaseNotice v-if="error" variant="destructive">{{ error }}</BaseNotice>

    <BaseEmpty
      v-if="hasLoaded && !messages.length && !error"
      title="Queue is empty"
      desc="There are no ready messages to peek."
      icon="hugeicons:inbox"
    />

    <div
      v-else-if="messages.length"
      class="grid min-h-0 flex-1 gap-2 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
    >
      <BrokerMessageTable
        :messages="messages"
        :selected-id="selected?.id ?? null"
        variant="rabbitmq"
        @select="selected = $event"
      />
      <BrokerMessageDetail
        v-if="selected"
        :message="selected"
        @close="selected = null"
      />
    </div>
  </div>
</template>
