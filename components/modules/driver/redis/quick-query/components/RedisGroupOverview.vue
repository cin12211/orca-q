<script setup lang="ts">
import { DYNAMIC_COLUMN_TYPES } from '~/components/base/data-grid/utils';
import { formatBytes } from '~/core/helpers/bytes-formatter';
import type { RedisKeyListItem } from '~/core/types/redis-workspace.types';
import {
  buildRedisGroupOverviewColumnDefs,
  buildRedisGroupOverviewRows,
} from '../utils/redisGroupOverview';

const props = withDefaults(
  defineProps<{
    prefix: string;
    keyCount?: number;
    memoryUsage?: number | null;
    items?: RedisKeyListItem[];
    loading?: boolean;
  }>(),
  { items: () => [], loading: false }
);

const memoryUsageLabel = computed(() =>
  props.memoryUsage === null || props.memoryUsage === undefined
    ? '—'
    : formatBytes(props.memoryUsage)
);

const keyCountLabel = computed(() =>
  typeof props.keyCount === 'number' ? props.keyCount : '—'
);

const columnDefs = computed(() =>
  buildRedisGroupOverviewColumnDefs(props.items)
);
const rowData = computed(() => buildRedisGroupOverviewRows(props.items));
</script>

<template>
  <div class="h-full flex flex-col gap-3 p-4">
    <div class="flex items-center gap-2">
      <Icon name="material-icon-theme:folder-database" class="size-5 min-w-5" />
      <h2 class="text-sm font-semibold break-all" :title="prefix">
        {{ prefix }}
      </h2>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div class="rounded-lg border p-3">
        <div class="text-xs text-muted-foreground">Keys</div>
        <div class="text-lg font-semibold">{{ keyCountLabel }}</div>
      </div>
      <div class="rounded-lg border p-3">
        <div class="text-xs text-muted-foreground">Approx. Memory Usage</div>
        <div class="text-lg font-semibold">{{ memoryUsageLabel }}</div>
      </div>
    </div>

    <div class="flex-1 min-h-0 relative">
      <LoadingOverlay :visible="loading" />

      <BaseDataGrid
        :column-defs="columnDefs"
        :row-data="rowData"
        :column-types="DYNAMIC_COLUMN_TYPES"
        empty-title="No keys"
        empty-description="No keys match this group."
        class="h-full border rounded-md"
      />
    </div>
  </div>
</template>
