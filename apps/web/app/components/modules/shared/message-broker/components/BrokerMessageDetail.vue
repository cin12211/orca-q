<script setup lang="ts">
import VueJsonPretty from 'vue-json-pretty';
import type { JSONDataType } from 'vue-json-pretty/types/utils';
import { useCopyToClipboard } from '~/core/composables/useCopyToClipboard';
import { useVueJsonPrettyTheme } from '~/core/composables/useVueJsonPrettyTheme';
import type { BrokerMessage } from '~/core/types/broker-message.types';
import { decodeBrokerPayload, formatBytes, formatDateTime } from '../utils';
import BrokerKeyValueTable from './BrokerKeyValueTable.vue';

const props = defineProps<{ message: BrokerMessage }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const { themeMode, themeClass, themeStyle } = useVueJsonPrettyTheme();
const { copied, handleCopy } = useCopyToClipboard();

const decoded = computed(() => decodeBrokerPayload(props.message));
const metadata = computed(() => {
  const message = props.message;
  const rows: Record<string, unknown> = {};

  if (message.partition !== undefined) rows.Partition = message.partition;
  if (message.offset !== undefined) rows.Offset = message.offset;
  if (message.key !== undefined) rows.Key = message.key ?? '(null)';
  if (message.exchange !== undefined)
    rows.Exchange = message.exchange || '(default)';
  if (message.routingKey !== undefined)
    rows['Routing key'] = message.routingKey || '-';
  if (message.isRedelivered !== undefined) {
    rows.Redelivered = message.isRedelivered ? 'Yes' : 'No';
  }
  rows.Timestamp = formatDateTime(message.timestamp);
  rows.Size = formatBytes(message.payloadBytes);

  return rows;
});
</script>

<template>
  <div
    class="flex h-full min-h-0 flex-col gap-3 overflow-y-auto rounded-lg border bg-background p-3"
  >
    <div class="flex items-center justify-between gap-2">
      <h3 class="text-sm font-medium">Message</h3>
      <div class="flex items-center gap-1">
        <Button size="xxs" variant="outline" @click="handleCopy(decoded.text)">
          <Icon
            :name="copied ? 'hugeicons:tick-02' : 'hugeicons:copy-01'"
            class="size-3.5!"
          />
          Copy payload
        </Button>
        <Button
          size="iconSm"
          variant="ghost"
          aria-label="Close message"
          @click="emit('close')"
        >
          <Icon name="hugeicons:cancel-01" class="size-4!" />
        </Button>
      </div>
    </div>

    <BrokerKeyValueTable :entries="metadata" />

    <BaseNotice v-if="message.isTruncated" variant="secondary">
      Payload is truncated to the first 256 KB.
    </BaseNotice>

    <div class="space-y-1">
      <h4
        class="text-xs font-medium uppercase tracking-wider text-muted-foreground"
      >
        Payload
        <span class="normal-case tracking-normal">({{ decoded.kind }})</span>
      </h4>
      <VueJsonPretty
        v-if="decoded.kind === 'json'"
        :data="decoded.json as JSONDataType"
        :deep="3"
        :show-length="true"
        :theme="themeMode"
        :class="themeClass"
        :style="themeStyle"
        class="text-xs"
      />
      <pre
        v-else
        class="whitespace-pre-wrap break-all rounded-md bg-muted/40 p-2 font-mono text-xs"
        >{{ decoded.text || '(empty)' }}</pre
      >
    </div>

    <div class="space-y-1">
      <h4
        class="text-xs font-medium uppercase tracking-wider text-muted-foreground"
      >
        Headers
      </h4>
      <BrokerKeyValueTable :entries="message.headers" empty-text="No headers" />
    </div>

    <div v-if="message.properties" class="space-y-1">
      <h4
        class="text-xs font-medium uppercase tracking-wider text-muted-foreground"
      >
        Properties
      </h4>
      <BrokerKeyValueTable
        :entries="message.properties"
        empty-text="No properties"
      />
    </div>
  </div>
</template>
