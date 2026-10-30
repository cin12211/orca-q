<script setup lang="ts">
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { RabbitBinding } from '~/core/types/rabbitmq.types';
import { RABBIT_DEFAULT_EXCHANGE_LABEL } from '../constants';

defineProps<{
  bindings: RabbitBinding[];
  /** Which end of the binding to show as the link target. */
  show: 'source' | 'destination';
}>();

const emit = defineEmits<{
  (e: 'open-exchange', name: string): void;
  (e: 'open-queue', name: string): void;
}>();
</script>

<template>
  <p v-if="!bindings.length" class="text-xs text-muted-foreground">
    No bindings
  </p>
  <div v-else class="overflow-auto rounded-lg border">
    <Table class="text-xs">
      <TableHeader>
        <TableRow>
          <TableHead>{{
            show === 'source' ? 'From exchange' : 'To'
          }}</TableHead>
          <TableHead>Routing key</TableHead>
          <TableHead>Arguments</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="(binding, index) in bindings" :key="index">
          <TableCell>
            <button
              v-if="show === 'source'"
              type="button"
              class="font-mono text-primary hover:underline cursor-pointer"
              @click="emit('open-exchange', binding.source)"
            >
              {{ binding.source || RABBIT_DEFAULT_EXCHANGE_LABEL }}
            </button>
            <button
              v-else
              type="button"
              class="font-mono text-primary hover:underline cursor-pointer"
              @click="
                binding.destinationType === 'queue'
                  ? emit('open-queue', binding.destination)
                  : emit('open-exchange', binding.destination)
              "
            >
              {{ binding.destination }}
              <span class="text-muted-foreground"
                >({{ binding.destinationType }})</span
              >
            </button>
          </TableCell>
          <TableCell class="font-mono">{{
            binding.routingKey || '-'
          }}</TableCell>
          <TableCell class="font-mono">
            {{
              Object.keys(binding.arguments).length
                ? JSON.stringify(binding.arguments)
                : '-'
            }}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
