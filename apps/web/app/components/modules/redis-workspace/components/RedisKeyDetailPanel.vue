<script setup lang="ts">
import { LoadingOverlay } from '#components';
import {
  getRedisKeyIcon,
  getRedisKeyIconClass,
} from '~/components/modules/management/redis-browser/hooks/useRedisTreeData';
import type {
  RedisKeyDetail,
  RedisKeyInfo,
  RedisKeyTableRow,
  RedisValueUpdatePayload,
} from '~/core/types/redis-workspace.types';
import RedisKeyDetailHeader from './redis-key-detail/RedisKeyDetailHeader.vue';
import RedisKeyMetadataBar from './redis-key-detail/RedisKeyMetadataBar.vue';
import RedisKeyValueViewer from './redis-key-detail/RedisKeyValueViewer.vue';

const props = defineProps<{
  info: RedisKeyInfo | null;
  detail: RedisKeyDetail | null;
  loadingInfo?: boolean;
  loadingValue?: boolean;
  saving?: boolean;
  canEdit?: boolean;
  unavailableReason?: string;
}>();

const emit = defineEmits<{
  (e: 'save', payload: RedisValueUpdatePayload): void;
  (e: 'refresh'): void;
  (e: 'delete'): void;
}>();

const textValue = ref('');
const jsonValue = shallowRef<unknown>(null);
const jsonMode = ref<'tree' | 'text'>('tree');
const tableRows = ref<RedisKeyTableRow[]>([]);
const ttlInput = ref('');
const autoRefreshEnabled = ref(false);
const autoRefreshIntervalSeconds = ref(5);

// The info call resolves before the full value call, so metadata (badges,
// header) renders from whichever is available while the value viewer keeps
// its own loading state.
const displayInfo = computed(() => props.info ?? props.detail);
const isLoading = computed(() => !!props.loadingInfo || !!props.loadingValue);
const hasAnyData = computed(() => !!displayInfo.value);
const isNotFound = computed(() => displayInfo.value?.type === 'none');

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
  },
  { immediate: true }
);

watch(
  displayInfo,
  info => {
    ttlInput.value = info && info.ttl >= 0 ? `${info.ttl}` : '';
  },
  { immediate: true }
);

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
  if (!displayInfo.value) {
    return undefined;
  }

  const normalized = ttlInput.value.trim();
  const original = displayInfo.value.ttl >= 0 ? `${displayInfo.value.ttl}` : '';

  if (normalized === original) {
    return undefined;
  }

  if (!normalized) {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
});

const detailTypeIcon = computed(() => {
  if (!displayInfo.value || displayInfo.value.type === 'none') {
    return 'hugeicons:database-02';
  }

  return getRedisKeyIcon(displayInfo.value.type);
});

const detailTypeIconClass = computed(() => {
  if (!displayInfo.value || displayInfo.value.type === 'none') {
    return 'text-primary';
  }

  return getRedisKeyIconClass(displayInfo.value.type);
});

const canUpdateTtl = computed(() => {
  if (!props.detail || !props.canEdit || !!ttlError.value || props.saving) {
    return false;
  }

  return resolvedTtlSeconds.value !== undefined;
});

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

  if (!autoRefreshEnabled.value || !displayInfo.value) {
    return;
  }

  autoRefreshTimer = setInterval(() => {
    if (!displayInfo.value || isLoading.value || props.saving) {
      return;
    }

    emit('refresh');
  }, autoRefreshIntervalSeconds.value * 1000);
};

watch(
  [
    autoRefreshEnabled,
    autoRefreshIntervalSeconds,
    () => displayInfo.value?.key,
  ],
  restartAutoRefreshTimer,
  { immediate: true }
);

watch(displayInfo, info => {
  if (!info) {
    clearAutoRefreshTimer();
  }
});

onBeforeUnmount(() => {
  clearAutoRefreshTimer();
});
</script>

<template>
  <div class="h-full relative flex flex-col gap-3 p-4 overflow-auto">
    <LoadingOverlay :visible="isLoading && !hasAnyData" />

    <BaseEmpty
      v-if="!hasAnyData && !isLoading"
      title="Select a Redis key"
      desc="Choose a key from the Redis browser to inspect its value and metadata."
    />

    <BaseEmpty
      v-else-if="isNotFound"
      icon="icons:404"
      title="Key not found"
      desc="This key no longer exists. It may have expired or been deleted."
    />

    <div v-else-if="displayInfo" class="space-y-4">
      <RedisKeyDetailHeader
        :icon="detailTypeIcon"
        :icon-class="detailTypeIconClass"
        :key-name="displayInfo.key"
        :type-label="`${displayInfo.type} key preview`"
        :loading="isLoading"
        :saving="!!saving"
        v-model:auto-refresh-enabled="autoRefreshEnabled"
        v-model:auto-refresh-interval-seconds="autoRefreshIntervalSeconds"
        @refresh="emit('refresh')"
        @delete="emit('delete')"
      />

      <Alert v-if="statusMessage" class="border-border bg-muted/20">
        <AlertDescription class="text-muted-foreground">
          {{ statusMessage }}
        </AlertDescription>
      </Alert>

      <RedisKeyMetadataBar
        :type-label="displayInfo.type"
        :size-label="displayInfo.memoryUsageHuman ?? 'n/a'"
        :length-label="
          displayInfo.length !== null && displayInfo.length !== undefined
            ? `${displayInfo.length}`
            : 'n/a'
        "
        :encoding-label="displayInfo.encoding ?? 'n/a'"
        :ttl-current-label="displayInfo.ttlLabel"
        :ttl-error="ttlError"
        :can-edit="!!canEdit"
        :can-update-ttl="canUpdateTtl"
        v-model:ttl-input="ttlInput"
        @update-ttl="emitTtlSave"
      />

      <div class="relative min-h-[320px]">
        <LoadingOverlay :visible="!!loadingValue && !detail" />

        <RedisKeyValueViewer
          v-if="detail"
          :detail="detail"
          :can-edit="!!canEdit"
          :saving="!!saving"
          :can-submit="canSubmit"
          v-model:text-value="textValue"
          v-model:json-value="jsonValue"
          v-model:json-mode="jsonMode"
          v-model:table-rows="tableRows"
          @save="emitSave"
        />
      </div>
    </div>
  </div>
</template>
