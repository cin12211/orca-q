<script setup lang="ts">
import { LoadingOverlay } from '#components';
import JsonEditorVue from 'json-editor-vue';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  getRedisKeyIcon,
  getRedisKeyIconClass,
} from '~/components/modules/management/redis-browser/hooks/useRedisTreeData';
import type {
  RedisKeyDetail,
  RedisKeyTableRow,
  RedisValueUpdatePayload,
} from '~/core/types/redis-workspace.types';

const props = defineProps<{
  detail: RedisKeyDetail | null;
  loading?: boolean;
  saving?: boolean;
  canEdit?: boolean;
  unavailableReason?: string;
}>();

const emit = defineEmits<{
  (e: 'save', payload: RedisValueUpdatePayload): void;
  (e: 'refresh'): void;
}>();

const textValue = ref('');
const jsonValue = shallowRef<unknown>(null);
const jsonMode = ref<'tree' | 'text'>('tree');
const tableRows = ref<RedisKeyTableRow[]>([]);
const ttlInput = ref('');
const autoRefreshEnabled = ref(false);
const autoRefreshIntervalSeconds = ref(5);

const AUTO_REFRESH_INTERVAL_OPTIONS = [5, 10, 30] as const;

const cloneValue = <T,>(value: T): T => {
  if (value === null || value === undefined) {
    return value;
  }

  return JSON.parse(JSON.stringify(value)) as T;
};

const areValuesEqual = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right);

watch(
  () => props.detail,
  detail => {
    textValue.value =
      detail?.previewKind === 'text' ? String(detail.value ?? '') : '';
    jsonValue.value =
      detail?.previewKind === 'json' ? cloneValue(detail.value) : null;
    tableRows.value = detail?.tableRows ? cloneValue(detail.tableRows) : [];
    ttlInput.value =
      detail?.ttl !== undefined && detail.ttl >= 0 ? `${detail.ttl}` : '';
  },
  { immediate: true }
);

const formattedReadOnlyValue = computed(() => {
  if (!props.detail) {
    return '';
  }

  if (typeof props.detail.value === 'string') {
    return props.detail.value;
  }

  return JSON.stringify(props.detail.value, null, 2);
});

const statusMessage = computed(() => {
  if (props.unavailableReason) {
    return props.unavailableReason;
  }

  if (props.detail?.previewKind === 'readonly') {
    return 'Value editing is unavailable for this Redis type. TTL changes can still be saved.';
  }

  return '';
});

const ttlError = computed(() => {
  const normalized = ttlInput.value.trim();

  if (!normalized) {
    return '';
  }

  const parsed = Number.parseInt(normalized, 10);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 'TTL must be empty or a non-negative integer.';
  }

  return '';
});

const resolvedTtlSeconds = computed<number | null | undefined>(() => {
  if (!props.detail) {
    return undefined;
  }

  const normalized = ttlInput.value.trim();
  const original = props.detail.ttl >= 0 ? `${props.detail.ttl}` : '';

  if (normalized === original) {
    return undefined;
  }

  if (!normalized) {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
});

const metadataBadges = computed(() => {
  if (!props.detail) {
    return [];
  }

  return [
    { label: `DB ${props.detail.databaseIndex}` },
    { label: props.detail.type },
    { label: `TTL ${props.detail.ttlLabel}` },
    { label: `Size ${props.detail.memoryUsageHuman ?? 'n/a'}` },
    {
      label:
        props.detail.length !== null && props.detail.length !== undefined
          ? `Length ${props.detail.length}`
          : 'Length n/a',
    },
    { label: `Encoding ${props.detail.encoding ?? 'n/a'}` },
  ];
});

const detailTypeIcon = computed(() => {
  if (!props.detail || props.detail.type === 'none') {
    return 'hugeicons:database-02';
  }

  return getRedisKeyIcon(props.detail.type);
});

const detailTypeIconClass = computed(() => {
  if (!props.detail || props.detail.type === 'none') {
    return 'text-primary';
  }

  return getRedisKeyIconClass(props.detail.type);
});

const canUpdateTtl = computed(() => {
  if (!props.detail || !props.canEdit || !!ttlError.value || props.saving) {
    return false;
  }

  return resolvedTtlSeconds.value !== undefined;
});

const ttlActionLabel = computed(() => 'Update TTL');

const showAddRowAction = computed(
  () => props.canEdit && props.detail?.previewKind === 'table'
);

const hasValueChanges = computed(() => {
  if (!props.detail) {
    return false;
  }

  switch (props.detail.previewKind) {
    case 'text':
      return textValue.value !== String(props.detail.value ?? '');
    case 'json':
      return !areValuesEqual(jsonValue.value, props.detail.value);
    case 'table':
      return !areValuesEqual(tableRows.value, props.detail.tableRows ?? []);
    default:
      return false;
  }
});

const hasPendingChanges = computed(
  () => hasValueChanges.value || resolvedTtlSeconds.value !== undefined
);

const canSubmit = computed(() => {
  if (!props.detail || !props.canEdit || !!ttlError.value) {
    return false;
  }

  return hasPendingChanges.value;
});

const updateTableCell = (rowId: string, key: string, value: string) => {
  const row = tableRows.value.find(item => item.id === rowId);

  if (!row) {
    return;
  }

  const column = props.detail?.tableColumns?.find(item => item.key === key);
  row[key] = column?.type === 'number' ? Number(value || 0) : value;
};

const reindexListRows = () => {
  if (props.detail?.tableKind !== 'list') {
    return;
  }

  tableRows.value = tableRows.value.map((row, index) => ({
    ...row,
    index,
  }));
};

const addRow = () => {
  if (!props.detail?.tableKind) {
    return;
  }

  const nextId = `row-${Date.now()}-${tableRows.value.length}`;

  switch (props.detail.tableKind) {
    case 'hash':
      tableRows.value.push({ id: nextId, field: '', value: '' });
      break;
    case 'list':
      tableRows.value.push({
        id: nextId,
        index: tableRows.value.length,
        value: '',
      });
      break;
    case 'set':
      tableRows.value.push({ id: nextId, value: '' });
      break;
    case 'zset':
      tableRows.value.push({ id: nextId, value: '', score: 0 });
      break;
  }
};

const removeRow = (rowId: string) => {
  tableRows.value = tableRows.value.filter(row => row.id !== rowId);
  reindexListRows();
};

const emitSave = () => {
  if (!props.detail || !canSubmit.value) {
    return;
  }

  const payload: RedisValueUpdatePayload = {
    previewKind: props.detail.previewKind,
    stringFormat: props.detail.stringFormat,
    tableKind: props.detail.tableKind,
    ttlSeconds: resolvedTtlSeconds.value,
    value: props.detail.value,
  };

  if (props.detail.previewKind === 'text') {
    payload.value = textValue.value;
  }

  if (props.detail.previewKind === 'json') {
    payload.value = jsonValue.value;
  }

  if (props.detail.previewKind === 'table') {
    payload.value = cloneValue(tableRows.value);
  }

  emit('save', payload);
};

const emitTtlSave = () => {
  if (!canUpdateTtl.value) {
    return;
  }

  emitSave();
};

let autoRefreshTimer: ReturnType<typeof setInterval> | null = null;

const clearAutoRefreshTimer = () => {
  if (autoRefreshTimer !== null) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
};

const restartAutoRefreshTimer = () => {
  clearAutoRefreshTimer();

  if (!autoRefreshEnabled.value || !props.detail) {
    return;
  }

  autoRefreshTimer = setInterval(() => {
    if (!props.detail || props.loading || props.saving) {
      return;
    }

    emit('refresh');
  }, autoRefreshIntervalSeconds.value * 1000);
};

watch(
  [autoRefreshEnabled, autoRefreshIntervalSeconds, () => props.detail?.key],
  restartAutoRefreshTimer,
  { immediate: true }
);

watch(
  () => props.detail,
  detail => {
    if (!detail) {
      clearAutoRefreshTimer();
    }
  }
);

onBeforeUnmount(() => {
  clearAutoRefreshTimer();
});
</script>

<template>
  <div class="h-full flex flex-col gap-3 p-4 overflow-auto">
    <div
      v-if="loading && !detail"
      class="relative min-h-[240px] overflow-hidden rounded-lg border bg-background"
    >
      <div
        class="flex h-full min-h-[240px] items-center justify-center px-4 text-sm text-muted-foreground"
      >
        Loading Redis key detail...
      </div>
      <LoadingOverlay :visible="true" />
    </div>

    <BaseEmpty
      v-else-if="!detail && !loading"
      title="Select a Redis key"
      desc="Choose a key from the Redis browser to inspect its value and metadata."
    />

    <BaseEmpty
      v-else-if="detail?.type === 'none'"
      icon="icons:404"
      title="Key not found"
      desc="This key no longer exists. It may have expired or been deleted."
    />

    <div v-else-if="detail" class="space-y-4">
      <div class="flex flex-col gap-1">
        <div class="flex items-start gap-2">
          <Icon
            :name="detailTypeIcon"
            :class="['mt-0.5 size-4 min-w-4', detailTypeIconClass]"
          />
          <div class="text-sm font-semibold break-all">{{ detail.key }}</div>
        </div>
        <div class="text-xs text-muted-foreground">
          {{ detail.type }} key preview
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <Badge
          v-for="badge in metadataBadges"
          :key="badge.label"
          variant="outline"
          class="h-6 px-2 text-[11px] font-normal"
        >
          {{ badge.label }}
        </Badge>

        <div class="ml-auto flex items-center gap-2">
          <Switch
            id="redis-auto-refresh"
            v-model:checked="autoRefreshEnabled"
          />
          <Label for="redis-auto-refresh" class="text-xs font-medium">
            Auto refresh
          </Label>
          <Button
            variant="ghost"
            size="sm"
            class="h-7 px-2 text-xs"
            aria-label="Refresh key detail"
            :disabled="loading || saving"
            @click="emit('refresh')"
          >
            <Icon name="hugeicons:redo" class="size-3.5! min-w-3.5" />
            Refresh
          </Button>
          <select
            v-if="autoRefreshEnabled"
            v-model="autoRefreshIntervalSeconds"
            class="h-7 rounded-md border bg-background px-2 text-xs"
            aria-label="Auto refresh interval"
          >
            <option
              v-for="interval in AUTO_REFRESH_INTERVAL_OPTIONS"
              :key="interval"
              :value="interval"
            >
              {{ interval }}s
            </option>
          </select>
        </div>
      </div>

      <Alert v-if="statusMessage" class="border-border bg-muted/20">
        <AlertDescription class="text-muted-foreground">
          {{ statusMessage }}
        </AlertDescription>
      </Alert>

      <div class="grid gap-3 md:grid-cols-[220px_1fr] items-start">
        <div class="space-y-1">
          <Label for="redis-ttl-input">TTL (seconds)</Label>
          <div class="flex items-center gap-2">
            <Input
              id="redis-ttl-input"
              size="sm"
              :model-value="ttlInput"
              :disabled="!canEdit"
              placeholder="Leave empty to persist"
              @update:model-value="ttlInput = String($event || '')"
            />
            <Button
              variant="outline"
              size="xs"
              :disabled="!canUpdateTtl"
              @click="emitTtlSave"
            >
              {{ ttlActionLabel }}
            </Button>
          </div>
          <p class="text-xs text-muted-foreground">
            Current: {{ detail.ttlLabel }}
          </p>
          <p v-if="ttlError" class="text-xs text-destructive">
            {{ ttlError }}
          </p>
        </div>
      </div>

      <div v-if="detail.previewKind === 'text'" class="space-y-3">
        <textarea
          v-model="textValue"
          :readonly="!canEdit"
          class="min-h-[320px] w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono"
        />
      </div>

      <div
        v-else-if="detail.previewKind === 'json'"
        class="min-h-[360px] overflow-hidden rounded-lg border"
      >
        <JsonEditorVue
          v-model="jsonValue"
          class="h-[360px]"
          :mode="jsonMode as unknown as undefined"
          :navigationBar="false"
          :readOnly="!canEdit"
          @modeChange="jsonMode = $event"
        />
      </div>

      <div v-else-if="detail.previewKind === 'table'" class="space-y-3">
        <div class="flex justify-end">
          <Button
            v-if="showAddRowAction"
            variant="outline"
            size="sm"
            @click="addRow"
          >
            Add Row
          </Button>
        </div>

        <div class="overflow-hidden rounded-lg border">
          <table class="w-full text-sm">
            <thead class="bg-muted/30 text-left">
              <tr>
                <th
                  v-for="column in detail.tableColumns"
                  :key="column.key"
                  class="px-3 py-2 font-medium"
                >
                  {{ column.label }}
                </th>
                <th class="w-16 px-3 py-2 font-medium"></th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="row in tableRows"
                :key="row.id"
                class="border-t align-top"
              >
                <td
                  v-for="column in detail.tableColumns"
                  :key="column.key"
                  class="px-3 py-2"
                >
                  <Input
                    v-if="column.editable"
                    size="sm"
                    :model-value="`${row[column.key] ?? ''}`"
                    :disabled="!canEdit"
                    @update:model-value="
                      updateTableCell(row.id, column.key, String($event || ''))
                    "
                  />
                  <span v-else>{{ row[column.key] }}</span>
                </td>
                <td class="px-3 py-2 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    :disabled="!canEdit"
                    @click="removeRow(row.id)"
                  >
                    Remove
                  </Button>
                </td>
              </tr>

              <tr v-if="tableRows.length === 0">
                <td
                  :colspan="(detail.tableColumns?.length || 0) + 1"
                  class="px-3 py-6 text-center text-sm text-muted-foreground"
                >
                  No rows available.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <pre
        v-else
        class="min-h-[320px] overflow-auto rounded-lg border bg-muted/20 p-3 text-xs"
      ><code>{{ formattedReadOnlyValue }}</code></pre>

      <div class="flex justify-end">
        <Button size="sm" :disabled="saving || !canSubmit" @click="emitSave">
          Save Changes
        </Button>
      </div>
    </div>
  </div>
</template>
