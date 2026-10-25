<script setup lang="ts">
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { BrokerMessage } from '~/core/types/broker-message.types';
import { formatBytes, formatDateTime, previewBrokerPayload } from '../utils';

const props = defineProps<{
  messages: BrokerMessage[];
  selectedId: string | null;
  variant: 'rabbitmq' | 'kafka';
}>();

const emit = defineEmits<{ (e: 'select', message: BrokerMessage): void }>();

const isKafka = computed(() => props.variant === 'kafka');
</script>

<template>
  <div class="min-h-0 overflow-auto rounded-lg border">
    <Table class="text-xs">
      <TableHeader class="sticky top-0 bg-background z-10">
        <TableRow>
          <template v-if="isKafka">
            <TableHead class="w-16">Partition</TableHead>
            <TableHead class="w-20">Offset</TableHead>
            <TableHead class="w-40">Timestamp</TableHead>
            <TableHead class="w-40">Key</TableHead>
          </template>
          <template v-else>
            <TableHead class="w-10">#</TableHead>
            <TableHead class="w-40">Routing key</TableHead>
            <TableHead class="w-24">Redelivered</TableHead>
          </template>
          <TableHead>Payload</TableHead>
          <TableHead class="w-20 text-right">Size</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow
          v-for="(message, index) in messages"
          :key="message.id"
          class="cursor-pointer"
          :data-state="message.id === selectedId ? 'selected' : undefined"
          @click="emit('select', message)"
        >
          <template v-if="isKafka">
            <TableCell class="tabular-nums">{{ message.partition }}</TableCell>
            <TableCell class="tabular-nums">{{ message.offset }}</TableCell>
            <TableCell class="whitespace-nowrap">
              {{ formatDateTime(message.timestamp) }}
            </TableCell>
            <TableCell class="font-mono truncate max-w-40">
              {{ message.key ?? '-' }}
            </TableCell>
          </template>
          <template v-else>
            <TableCell class="tabular-nums">{{ index + 1 }}</TableCell>
            <TableCell class="font-mono truncate max-w-40">
              {{ message.routingKey || '-' }}
            </TableCell>
            <TableCell>{{ message.isRedelivered ? 'Yes' : 'No' }}</TableCell>
          </template>
          <TableCell class="font-mono truncate max-w-0 w-full">
            {{ previewBrokerPayload(message) }}
          </TableCell>
          <TableCell class="text-right tabular-nums whitespace-nowrap">
            {{ formatBytes(message.payloadBytes) }}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
