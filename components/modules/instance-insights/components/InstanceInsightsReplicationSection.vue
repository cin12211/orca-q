<script setup lang="ts">
import {
  buildMappedColumnsFromKeys as buildColumnsFromKeys,
  buildMappedColumnsFromRows as buildColumnsFromRows,
} from '~/core/helpers';
import type {
  InstanceInsightsReplication,
  ReplicationSlotDesiredStatus,
  ReplicationSlotRow,
} from '~/core/types';
import { formatBytes, formatDateTime } from '../utils/formatters';

const props = defineProps<{
  replication: InstanceInsightsReplication | null;
  isLoading: boolean;
  isActionLoading: boolean;
  onRefresh: () => void | Promise<void>;
  onToggleSlotStatus: (params: {
    slotName: string;
    desiredStatus: ReplicationSlotDesiredStatus;
    activePid?: number | null;
    slotType?: string | null;
  }) => Promise<void>;
  onDropSlot: (slotName: string) => Promise<void>;
}>();

const replicationStats = computed(
  () => props.replication?.replicationStats || []
);
const replicationSlots = computed(
  () => props.replication?.replicationSlots || []
);

const selectedSlotRows = ref<Record<string, unknown>[]>([]);

const onSelectedSlotRows = (rows: unknown[]) => {
  selectedSlotRows.value = rows as Record<string, unknown>[];
};

const replicationStatsTableRows = computed<Record<string, unknown>[]>(() =>
  replicationStats.value.map(row => ({
    pid: row.pid,
    client_addr: row.clientAddr || '-',
    application: row.applicationName || '-',
    state: row.state || '-',
    sync_state: row.syncState || '-',
    reply_time: formatDateTime(row.replyTime),
    write_lag: row.writeLag || '-',
    flush_lag: row.flushLag || '-',
    replay_lag: row.replayLag || '-',
  }))
);

const REPLICATION_STATS_COLUMN_KEYS = [
  'pid',
  'client_addr',
  'application',
  'state',
  'sync_state',
  'reply_time',
  'write_lag',
  'flush_lag',
  'replay_lag',
] as const;

const replicationStatsColumns = computed(() => {
  if (replicationStatsTableRows.value.length > 0) {
    return buildColumnsFromRows(replicationStatsTableRows.value);
  }

  return buildColumnsFromKeys(REPLICATION_STATS_COLUMN_KEYS);
});

const replicationSlotsTableRows = computed<Record<string, unknown>[]>(() =>
  replicationSlots.value.map(row => ({
    slot_name: row.slotName,
    slot_type: row.slotType,
    status: row.active ? 'on' : 'off',
    active_pid: row.activePid ?? '-',
    restart_lsn: row.restartLsn || '-',
    retained_wal: formatBytes(row.retainedBytes),
    temporary: row.temporary ? 'yes' : 'no',
  }))
);

const replicationSlotsColumns = computed(() =>
  buildColumnsFromRows(replicationSlotsTableRows.value)
);

const TABLE_MAX_HEIGHT_PX = 300;
const TABLE_EMPTY_HEIGHT_PX = 120;
const TABLE_HEADER_HEIGHT_PX = 44;
const TABLE_ROW_HEIGHT_PX = 36;

const getTableHeightPx = (rowCount: number) => {
  if (rowCount <= 0) return TABLE_EMPTY_HEIGHT_PX;

  return Math.min(
    TABLE_MAX_HEIGHT_PX,
    TABLE_HEADER_HEIGHT_PX + rowCount * TABLE_ROW_HEIGHT_PX
  );
};

const replicationStatsTableHeight = computed(
  () => `${getTableHeightPx(replicationStatsTableRows.value.length)}px`
);

const replicationSlotsTableHeight = computed(
  () => `${getTableHeightPx(replicationSlotsTableRows.value.length)}px`
);

const selectedSlot = computed<ReplicationSlotRow | null>(() => {
  const slotName = String(selectedSlotRows.value[0]?.slot_name || '');
  if (!slotName) return null;
  return (
    replicationSlots.value.find(slot => slot.slotName === slotName) || null
  );
});

const selectedSlotNextStatus = computed<ReplicationSlotDesiredStatus>(() =>
  selectedSlot.value?.active ? 'off' : 'on'
);

const selectedSlotActionLabel = computed(() =>
  selectedSlotNextStatus.value === 'off' ? 'Turn Off Slot' : 'Turn On Slot'
);

const withConfirm = (message: string) => {
  if (!import.meta.client) return true;
  return window.confirm(message);
};

const onDropSelectedSlot = async () => {
  if (!selectedSlot.value) return;
  if (
    !withConfirm(
      `Drop replication slot "${selectedSlot.value.slotName}"? This action cannot be undone.`
    )
  ) {
    return;
  }
  await props.onDropSlot(selectedSlot.value.slotName);
};

const onToggleSelectedSlotStatus = async () => {
  if (!selectedSlot.value) return;

  if (
    !withConfirm(
      `Switch replication slot "${selectedSlot.value.slotName}" to ${selectedSlotNextStatus.value.toUpperCase()} status?`
    )
  ) {
    return;
  }

  await props.onToggleSlotStatus({
    slotName: selectedSlot.value.slotName,
    desiredStatus: selectedSlotNextStatus.value,
    activePid: selectedSlot.value.activePid,
    slotType: selectedSlot.value.slotType,
  });
};
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-sm font-medium">Replication</h3>
        <p class="text-xs text-muted-foreground">Replication stats and slots</p>
      </div>

      <Button
        variant="outline"
        size="xs"
        :disabled="isLoading || isActionLoading"
        class="font-normal"
        @click="onRefresh()"
      >
        <Icon
          name="hugeicons:redo"
          :class="['size-4', isLoading && 'animate-spin']"
        />
        Refresh Replication
      </Button>
    </div>

    <div
      v-if="replication?.staleSlotWarning"
      class="border border-orange-300 bg-orange-50 text-orange-700 rounded-lg p-3 text-sm"
    >
      {{ replication.staleSlotWarning }}
    </div>

    <div class="space-y-1.5">
      <p class="text-sm">Replication Stats</p>
      <div
        class="max-h-[300px]"
        :style="{ height: replicationStatsTableHeight }"
      >
        <DynamicTable
          :columns="replicationStatsColumns"
          :data="replicationStatsTableRows"
          class="h-full border rounded-md"
          columnKeyBy="field"
        />
      </div>
    </div>

    <div class="space-y-1.5">
      <h4 class="text-sm font-normal">Replication Slots</h4>
      <div
        class="max-h-[300px]"
        :style="{ height: replicationSlotsTableHeight }"
      >
        <DynamicTable
          :columns="replicationSlotsColumns"
          :data="replicationSlotsTableRows"
          :selectedRows="selectedSlotRows"
          class="h-full border rounded-md"
          columnKeyBy="field"
          @on-selected-rows="onSelectedSlotRows"
        />
      </div>
    </div>

    <div v-if="selectedSlot" class="border rounded-lg p-2.5">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <p class="text-sm font-medium">
          Selected Slot: {{ selectedSlot.slotName }} ({{
            selectedSlot.active ? 'on' : 'off'
          }}) · Active PID: {{ selectedSlot.activePid ?? '-' }}
        </p>

        <div class="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            :disabled="isActionLoading"
            @click="onToggleSelectedSlotStatus"
          >
            {{ selectedSlotActionLabel }}
          </Button>
          <Button
            variant="outline"
            size="sm"
            :disabled="isActionLoading"
            @click="onDropSelectedSlot"
          >
            Drop Slot
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
