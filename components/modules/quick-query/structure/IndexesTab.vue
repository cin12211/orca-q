<script setup lang="ts">
import { DynamicTable } from '#components';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { Button } from '~/components/ui/button';
import {
  buildMappedColumnsFromKeys,
  buildMappedColumnsFromRows,
} from '~/core/helpers';
import { getConnectionParams } from '~/core/helpers/connection-helper';
import { useManagementConnectionStore } from '~/core/stores';
import { useSchemaStore } from '~/core/stores/useSchemaStore';
import type { TableIndex } from '~/core/types';
import {
  getStructureTableHeightPx,
  STRUCTURE_TABLE_MAX_HEIGHT_PX,
} from './tableSizing';

const props = defineProps<{
  schema: string;
  tableName: string;
  connectionId?: string;
}>();

const INDEXES_COLUMN_KEYS = [
  'index_name',
  'method',
  'is_unique',
  'is_primary',
  'definition',
] as const;

const schemaStore = useSchemaStore();
const cacheKey = computed(() => `${props.schema}.${props.tableName}`);

const error = ref<string | null>(null);

const connectionStore = useManagementConnectionStore();
const connection = computed(() => {
  if (props.connectionId) {
    return connectionStore.connections.find(c => c.id === props.connectionId);
  }
  return connectionStore.selectedConnection;
});

const { data, status } = useFetch<TableIndex[]>('/api/tables/indexes', {
  method: 'POST',
  body: computed(() => ({
    ...getConnectionParams(connection.value),
    schema: props.schema,
    table: props.tableName,
  })),
  key: `indexes-${cacheKey.value}`,
  getCachedData: () => {
    const cached = schemaStore.indexesMap[cacheKey.value];
    return cached?.length ? cached : undefined;
  },
  onResponse({ response }) {
    if (response._data) {
      schemaStore.indexesMap[cacheKey.value] = response._data;
    }
  },
  onResponseError({ response }) {
    error.value = response._data?.message || 'Failed to load indexes';
  },
});

const rows = computed<Record<string, unknown>[]>(() =>
  (data.value || []).map(index => ({
    index_name: index.indexName,
    method: index.method,
    is_unique: index.isUnique,
    is_primary: index.isPrimary,
    definition: index.definition,
  }))
);

const mappedColumns = computed(() => {
  if (rows.value.length > 0) {
    return buildMappedColumnsFromRows(rows.value);
  }

  return buildMappedColumnsFromKeys(INDEXES_COLUMN_KEYS);
});

const tableHeight = computed(
  () => `${getStructureTableHeightPx(rows.value.length)}px`
);

const onRetry = () => {
  error.value = null;
  refreshNuxtData(`indexes-${cacheKey.value}`);
};
</script>

<template>
  <div class="relative">
    <LoadingOverlay :visible="status === 'pending'" />

    <div v-if="error" class="p-2">
      <Alert variant="destructive">
        <AlertDescription class="flex items-center justify-between gap-2">
          <span>{{ error }}</span>
          <Button variant="outline" size="xs" @click="onRetry">Retry</Button>
        </AlertDescription>
      </Alert>
    </div>

    <div
      v-else-if="rows.length"
      :style="{
        maxHeight: `${STRUCTURE_TABLE_MAX_HEIGHT_PX}px`,
        height: tableHeight,
      }"
    >
      <DynamicTable
        :columns="mappedColumns"
        :data="rows"
        class="h-full"
        columnKeyBy="field"
      />
    </div>

    <div
      v-else-if="status !== 'pending'"
      class="flex items-center justify-center py-6"
    >
      <BaseEmpty title="No Indexes" desc="This table has no indexes." />
    </div>
  </div>
</template>
