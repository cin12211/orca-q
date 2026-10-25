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
  formatDateTime,
  formatNumber,
  useAutoRefresh,
  useBrokerRequest,
} from '~/components/modules/message-broker';
import type { Connection } from '~/core/stores';
import { rabbitmqService } from '../services';

const props = defineProps<{ connection: Connection }>();

const snapshot = useBrokerRequest(() =>
  rabbitmqService.connections(props.connection)
);
useAutoRefresh(snapshot.load);

const data = computed(() => snapshot.data.value);
const rate = (value: number | null) =>
  value === null ? '-' : `${formatBytes(value)}/s`;

onMounted(() => snapshot.load());
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-3">
    <ToolPageHeader
      icon="hugeicons:plug-socket"
      title="Connections & Channels"
      description="Clients connected to the broker, with prefetch and unacked messages per channel."
    >
      <template #actions>
        <Button
          size="xxs"
          variant="outline"
          :disabled="snapshot.isLoading.value"
          @click="snapshot.load()"
        >
          <Icon name="hugeicons:redo" class="size-3.5!" />
          Refresh
        </Button>
      </template>
    </ToolPageHeader>

    <BaseNotice v-if="snapshot.error.value" variant="destructive">{{
      snapshot.error.value
    }}</BaseNotice>

    <section class="space-y-2">
      <h3
        class="text-xs font-medium uppercase tracking-wider text-muted-foreground"
      >
        Connections ({{ formatNumber(data?.connections.length) }})
      </h3>
      <div class="relative overflow-auto rounded-lg border">
        <LoadingOverlay :visible="snapshot.isLoading.value && !data" />
        <Table class="text-xs">
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Peer</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Vhost</TableHead>
              <TableHead>State</TableHead>
              <TableHead class="text-right">Channels</TableHead>
              <TableHead class="text-right">Recv</TableHead>
              <TableHead class="text-right">Send</TableHead>
              <TableHead>Connected</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="item in data?.connections ?? []" :key="item.name">
              <TableCell class="font-mono">{{
                item.clientName ?? item.clientProduct ?? '-'
              }}</TableCell>
              <TableCell class="font-mono">{{ item.peer }}</TableCell>
              <TableCell>{{ item.user }}</TableCell>
              <TableCell class="font-mono">{{ item.vhost }}</TableCell>
              <TableCell :class="item.state === 'blocked' && 'text-rose-500'">{{
                item.state
              }}</TableCell>
              <TableCell class="text-right tabular-nums">{{
                item.channels
              }}</TableCell>
              <TableCell class="text-right tabular-nums">{{
                rate(item.receiveRate)
              }}</TableCell>
              <TableCell class="text-right tabular-nums">{{
                rate(item.sendRate)
              }}</TableCell>
              <TableCell class="whitespace-nowrap">{{
                formatDateTime(item.connectedAt)
              }}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </section>

    <section class="space-y-2">
      <h3
        class="text-xs font-medium uppercase tracking-wider text-muted-foreground"
      >
        Channels ({{ formatNumber(data?.channels.length) }})
      </h3>
      <div class="overflow-auto rounded-lg border">
        <Table class="text-xs">
          <TableHeader>
            <TableRow>
              <TableHead>Channel</TableHead>
              <TableHead>User</TableHead>
              <TableHead>State</TableHead>
              <TableHead class="text-right">Prefetch</TableHead>
              <TableHead class="text-right">Unacked</TableHead>
              <TableHead class="text-right">Consumers</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="item in data?.channels ?? []" :key="item.name">
              <TableCell class="font-mono">{{ item.name }}</TableCell>
              <TableCell>{{ item.user }}</TableCell>
              <TableCell>{{ item.state }}</TableCell>
              <TableCell
                class="text-right tabular-nums"
                :class="item.prefetchCount === 0 && 'text-amber-500'"
              >
                {{
                  item.prefetchCount === 0 ? 'Unlimited' : item.prefetchCount
                }}
              </TableCell>
              <TableCell class="text-right tabular-nums">{{
                formatNumber(item.messagesUnacknowledged)
              }}</TableCell>
              <TableCell class="text-right tabular-nums">{{
                item.consumerCount
              }}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </section>
  </div>
</template>
