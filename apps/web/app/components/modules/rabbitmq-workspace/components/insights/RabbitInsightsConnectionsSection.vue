<script setup lang="ts">
import {
  formatBytes,
  formatDateTime,
  useBrokerRequest,
} from '~/components/modules/shared/message-broker';
import type { Connection } from '~/core/stores';
import type { RabbitConnectionSummary } from '~/core/types/rabbitmq.types';
import { useRabbitChange, useRabbitInsightsRefresh } from '../../hooks';
import { rabbitmqService } from '../../services';
import RabbitConfirmDialog from './RabbitConfirmDialog.vue';
import RabbitConnectionDetailDialog from './RabbitConnectionDetailDialog.vue';
import RabbitInsightsTable from './RabbitInsightsTable.vue';

const DEFAULT_CLOSE_REASON = 'Closed from OrcaQ';

const props = defineProps<{
  connection: Connection;
  canManage: boolean;
  refreshKey: number;
  intervalMs: number;
}>();

const snapshot = useBrokerRequest(() =>
  rabbitmqService.connections(props.connection)
);
const { isSaving, run } = useRabbitChange(() => props.connection);
useRabbitInsightsRefresh(snapshot.load, {
  refreshKey: toRef(props, 'refreshKey'),
  intervalMs: toRef(props, 'intervalMs'),
});

const detailName = ref<string | null>(null);
const isDetailOpen = ref(false);
const closingName = ref<string | null>(null);
const closeReason = ref(DEFAULT_CLOSE_REASON);

const columns = [
  { key: 'client', label: 'Client' },
  { key: 'user', label: 'User' },
  { key: 'vhost', label: 'Virtual host' },
  { key: 'peer', label: 'Peer' },
  { key: 'protocol', label: 'Protocol' },
  { key: 'state', label: 'State' },
  { key: 'channels', label: 'Channels' },
  { key: 'network', label: 'From / to client' },
  { key: 'connected', label: 'Connected at' },
  { key: 'actions', label: '', class: 'w-20 text-right' },
];

const rows = computed(() =>
  (snapshot.data.value?.connections ?? []).map(item => ({ ...item }))
);
const asConnection = (row: Record<string, unknown>) =>
  row as unknown as RabbitConnectionSummary;
const rate = (value: number | null) =>
  value === null ? '-' : `${formatBytes(value)}/s`;

const openDetail = (name: string) => {
  detailName.value = name;
  isDetailOpen.value = true;
};

const askClose = (name: string) => {
  closingName.value = name;
  closeReason.value = DEFAULT_CLOSE_REASON;
};

const confirmClose = async () => {
  const name = closingName.value;
  if (!name) return;

  const isClosed = await run('Connection closed', target =>
    rabbitmqService.closeConnection(target, name, closeReason.value.trim())
  );

  if (isClosed) {
    closingName.value = null;
    await snapshot.load();
  }
};

onMounted(() => snapshot.load());
</script>

<template>
  <div class="space-y-3">
    <BaseNotice v-if="snapshot.error.value" variant="destructive">
      {{ snapshot.error.value }}
    </BaseNotice>
    <div class="relative">
      <LoadingOverlay
        :visible="snapshot.isLoading.value && !snapshot.data.value"
      />
      <RabbitInsightsTable
        :columns="columns"
        :rows="rows"
        row-key="name"
        empty-text="No client is connected right now."
      >
        <template #cell-client="{ row }">
          <div class="max-w-56 truncate" :title="asConnection(row).name">
            {{ asConnection(row).clientName ?? asConnection(row).name }}
          </div>
          <div
            v-if="asConnection(row).clientProduct"
            class="text-muted-foreground"
          >
            {{ asConnection(row).clientProduct }}
          </div>
        </template>
        <template #cell-network="{ row }">
          {{ rate(asConnection(row).receiveRate) }} /
          {{ rate(asConnection(row).sendRate) }}
        </template>
        <template #cell-connected="{ row }">
          {{ formatDateTime(asConnection(row).connectedAt) }}
        </template>
        <template #cell-actions="{ row }">
          <div class="flex justify-end gap-1">
            <Button
              size="iconSm"
              variant="ghost"
              title="Details"
              @click="openDetail(asConnection(row).name)"
            >
              <Icon name="hugeicons:information-circle" class="size-3.5!" />
            </Button>
            <Button
              v-if="canManage"
              size="iconSm"
              variant="ghost"
              title="Force close"
              @click="askClose(asConnection(row).name)"
            >
              <Icon
                name="hugeicons:cancel-circle"
                class="size-3.5! text-destructive"
              />
            </Button>
          </div>
        </template>
      </RabbitInsightsTable>
    </div>

    <RabbitConnectionDetailDialog
      v-model:open="isDetailOpen"
      :connection="connection"
      :connection-name="detailName"
    />

    <RabbitConfirmDialog
      :open="Boolean(closingName)"
      title="Force close this connection?"
      :description="`${closingName ?? ''} will be disconnected. The client gets the reason below and usually reconnects.`"
      confirm-label="Force close"
      is-destructive
      :is-saving="isSaving"
      @update:open="!$event && (closingName = null)"
      @confirm="confirmClose"
    >
      <div class="space-y-1.5">
        <Label for="rabbit-close-reason" class="text-xs">Reason</Label>
        <Input id="rabbit-close-reason" v-model="closeReason" />
      </div>
    </RabbitConfirmDialog>
  </div>
</template>
