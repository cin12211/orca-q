<script setup lang="ts">
import {
  BrokerMessageDetail,
  BrokerMessageTable,
  useBrokerRequest,
} from '~/components/modules/shared/message-broker';
import type { Connection } from '~/core/stores';
import type { BrokerMessage } from '~/core/types/broker-message.types';
import { useKafkaLive } from '../hooks';
import { kafkaService } from '../services';

const props = defineProps<{ connection: Connection; initialTopic?: string }>();

const topics = useBrokerRequest(() => kafkaService.topics(props.connection));
const live = useKafkaLive(() => props.connection);
const topic = ref(props.initialTopic ?? '');
const selected = ref<BrokerMessage | null>(null);

const toggle = async () => {
  if (live.isRunning.value) {
    await live.stop();
    return;
  }

  if (topic.value) await live.start(topic.value);
};

watch(topic, async () => {
  if (live.isRunning.value) {
    live.clear();
    await live.start(topic.value);
  }
});

onMounted(() => topics.load());
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-3 p-3">
    <ToolPageHeader
      icon="hugeicons:live-streaming-01"
      title="Live Tail"
      description="Shows messages produced after you press Start. Offsets of consumer groups are not touched."
    >
      <template #actions>
        <Select v-model="topic">
          <SelectTrigger size="sm" class="w-56 font-mono text-xs">
            <SelectValue placeholder="Choose a topic" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="item in topics.data.value ?? []"
              :key="item.name"
              :value="item.name"
            >
              {{ item.name }}
            </SelectItem>
          </SelectContent>
        </Select>
        <Button
          size="xxs"
          :variant="live.isRunning.value ? 'destructive' : 'default'"
          :disabled="!topic || live.isStarting.value"
          @click="toggle"
        >
          <Icon
            :name="live.isRunning.value ? 'hugeicons:stop' : 'hugeicons:play'"
            class="size-3.5!"
          />
          {{ live.isRunning.value ? 'Stop' : 'Start' }}
        </Button>
        <Button
          size="xxs"
          variant="outline"
          :disabled="!live.messages.value.length"
          @click="live.clear()"
        >
          Clear
        </Button>
      </template>
    </ToolPageHeader>

    <BaseNotice v-if="live.error.value" variant="destructive">{{
      live.error.value
    }}</BaseNotice>
    <BaseNotice v-if="topics.error.value" variant="destructive">{{
      topics.error.value
    }}</BaseNotice>

    <div
      v-if="live.isRunning.value"
      class="flex items-center gap-2 text-xs text-muted-foreground"
    >
      <span class="size-2 animate-pulse rounded-full bg-emerald-500" />
      Listening on <span class="font-mono">{{ topic }}</span> ·
      {{ live.messages.value.length }} messages (newest first, last 500 kept)
    </div>

    <BaseEmpty
      v-if="!live.messages.value.length"
      :title="
        live.isRunning.value ? 'Waiting for new messages' : 'Not listening'
      "
      :desc="
        live.isRunning.value
          ? 'New messages on this topic will appear here.'
          : 'Choose a topic and press Start.'
      "
      icon="hugeicons:live-streaming-01"
    />

    <div
      v-else
      class="grid min-h-0 flex-1 gap-2 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
    >
      <BrokerMessageTable
        :messages="live.messages.value"
        :selected-id="selected?.id ?? null"
        variant="kafka"
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
