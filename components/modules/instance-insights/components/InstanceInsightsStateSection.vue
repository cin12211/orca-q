<script setup lang="ts">
import { buildMappedColumnsFromRows as buildColumnsFromRows } from '~/core/helpers';
import type { InstanceInsightsState, InstanceSessionRow } from '~/core/types';
import {
  compactSql,
  formatDateTime,
  formatDuration,
  isIdleInTransaction,
} from '../utils/formatters';

const props = defineProps<{
  state: InstanceInsightsState | null;
  isLoading: boolean;
  isActionLoading: boolean;
  onRefresh: () => void | Promise<void>;
  onCancelQuery: (pid: number) => Promise<void>;
  onTerminateConnection: (pid: number) => Promise<void>;
}>();

const { highlightSql } = useCodeHighlighter();

const stateRows = computed(() => props.state?.sessions || []);
const lockRows = computed(() => props.state?.locks || []);
const preparedRows = computed(() => props.state?.preparedTransactions || []);

const selectedSessionRows = ref<Record<string, unknown>[]>([]);

const onSelectedSessionRows = (rows: unknown[]) => {
  selectedSessionRows.value = rows as Record<string, unknown>[];
};

const sessionTableRows = computed<Record<string, unknown>[]>(() =>
  stateRows.value.map(row => ({
    pid: row.pid,
    user: row.user,
    application: row.application || '-',
    client: row.client || '-',
    state: row.state || '-',
    wait_event: row.waitEvent || '-',
    blocking_pids: row.blockingPids.length ? row.blockingPids.join(', ') : '-',
    backend_start: formatDateTime(row.backendStart),
    transaction_start: formatDateTime(row.transactionStart),
    query_duration: formatDuration(row.durationSeconds),
    sql: compactSql(row.sql),
  }))
);

const sessionColumns = computed(() =>
  buildColumnsFromRows(sessionTableRows.value)
);

const lockTableRows = computed<Record<string, unknown>[]>(() =>
  lockRows.value.map(row => ({
    lock_type: row.lockType,
    target_relation: row.targetRelation || '-',
    mode: row.mode,
    granted: row.granted ? 'yes' : 'no',
    pid: row.pid ?? '-',
    user: row.user || '-',
    state: row.state || '-',
  }))
);

const lockColumns = computed(() => buildColumnsFromRows(lockTableRows.value));

const preparedTableRows = computed<Record<string, unknown>[]>(() =>
  preparedRows.value.map(row => ({
    gid: row.gid,
    transaction: row.transaction,
    prepared: formatDateTime(row.prepared),
    owner: row.owner,
    database: row.database,
  }))
);

const preparedColumns = computed(() =>
  buildColumnsFromRows(preparedTableRows.value)
);

const selectedSession = computed<InstanceSessionRow | null>(() => {
  const selectedPid = Number(selectedSessionRows.value[0]?.pid || 0);
  if (!selectedPid) return null;
  return stateRows.value.find(row => row.pid === selectedPid) || null;
});

const renderSqlPreview = (sql: string | null | undefined) => {
  if (!sql || !sql.trim()) {
    return '<pre><code>-</code></pre>';
  }

  const normalized = sql.replace(/\s+/g, ' ').trim();
  const snippet =
    normalized.length > 900 ? `${normalized.slice(0, 900)} ...` : normalized;

  return highlightSql(snippet);
};

const sessionSqlPreview = computed(() =>
  renderSqlPreview(selectedSession.value?.sql || null)
);

const getSessionCellClass = (_field: string, row: Record<string, unknown>) => {
  const stateText = String(row.state || '');
  return isIdleInTransaction(stateText) ? 'insights-danger-cell' : undefined;
};

const withConfirm = (message: string) => {
  if (!import.meta.client) return true;
  return window.confirm(message);
};

const onCancelSelectedQuery = async () => {
  if (!selectedSession.value) return;
  if (!withConfirm(`Cancel query for PID ${selectedSession.value.pid}?`))
    return;
  await props.onCancelQuery(selectedSession.value.pid);
};

const onTerminateSelectedConnection = async () => {
  if (!selectedSession.value) return;
  if (
    !withConfirm(`Terminate connection for PID ${selectedSession.value.pid}?`)
  ) {
    return;
  }
  await props.onTerminateConnection(selectedSession.value.pid);
};
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-sm font-medium">State</h3>
        <p class="text-xs text-muted-foreground">
          Active sessions, locks, prepared transactions
        </p>
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
        Refresh State
      </Button>
    </div>

    <div class="space-y-1.5">
      <h4 class="text-sm font-normal">Active Sessions</h4>
      <div class="h-[360px]">
        <DynamicTable
          :columns="sessionColumns"
          :data="sessionTableRows"
          :selectedRows="selectedSessionRows"
          :getCellClass="getSessionCellClass"
          class="h-full border rounded-md"
          columnKeyBy="field"
          @on-selected-rows="onSelectedSessionRows"
        />
      </div>
    </div>

    <div v-if="selectedSession" class="border rounded-lg p-2.5 space-y-2">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <p class="text-sm font-medium">
          Selected PID: {{ selectedSession.pid }} ({{
            selectedSession.state || '-'
          }})
        </p>
        <div class="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            :disabled="isActionLoading"
            @click="onCancelSelectedQuery"
          >
            Cancel Query
          </Button>
          <Button
            variant="outline"
            size="sm"
            :disabled="isActionLoading"
            @click="onTerminateSelectedConnection"
          >
            Terminate Connection
          </Button>
        </div>
      </div>

      <div>
        <p class="text-xs text-muted-foreground mb-1">SQL Preview</p>
        <div
          class="sql-preview border rounded-md overflow-hidden"
          v-html="sessionSqlPreview"
        />
      </div>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-2 gap-3">
      <div class="space-y-1.5">
        <h4 class="text-sm font-normal">Locks</h4>
        <div class="h-[300px]">
          <DynamicTable
            :columns="lockColumns"
            :data="lockTableRows"
            class="h-full border rounded-md"
            columnKeyBy="field"
          />
        </div>
      </div>

      <div class="space-y-1.5">
        <h4 class="text-sm font-normal">Prepared Transactions</h4>
        <div class="h-[300px]">
          <DynamicTable
            :columns="preparedColumns"
            :data="preparedTableRows"
            class="h-full border rounded-md"
            columnKeyBy="field"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sql-preview :deep(pre) {
  margin: 0;
  padding: 0.5rem;
  font-size: 11px;
  line-height: 1.4;
  border-radius: 0.375rem;
}

:deep(.insights-danger-cell) {
  background-color: #fee2e2;
}
</style>
