<script setup lang="ts">
import { computed, onMounted } from 'vue';
import {
  buildDynamicColumnDefs,
  buildDynamicRowData,
  DYNAMIC_COLUMN_TYPES,
} from '~/components/base/data-grid/utils';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { Button } from '~/components/ui/button';
import {
  buildMappedColumnsFromKeys,
  buildMappedColumnsFromRows,
} from '~/core/helpers';
import type { Connection } from '~/core/stores';
import { useMongoCollectionIndexes } from '../hooks';
import {
  getMongoInfoTableHeightPx,
  MONGO_INFO_TABLE_MAX_HEIGHT_PX,
} from '../utils';

const props = defineProps<{
  connection: Connection | undefined;
  collectionName: string;
  databaseName?: string;
}>();

const INDEXES_COLUMN_KEYS = [
  'name',
  'key',
  'unique',
  'sparse',
  'expireAfterSeconds',
] as const;

const { indexes, isLoading, error, fetchIndexes } = useMongoCollectionIndexes({
  connection: computed(() => props.connection),
  collectionName: computed(() => props.collectionName),
  databaseName: computed(() => props.databaseName),
});

const rows = computed<Record<string, unknown>[]>(() =>
  (indexes.value ?? []).map(index => ({
    name: index.name,
    key: JSON.stringify(index.key),
    unique: index.unique ?? false,
    sparse: index.sparse ?? false,
    expireAfterSeconds: index.expireAfterSeconds ?? null,
  }))
);

const mappedColumns = computed(() => {
  if (rows.value.length > 0) {
    return buildMappedColumnsFromRows(rows.value);
  }

  return buildMappedColumnsFromKeys(INDEXES_COLUMN_KEYS);
});

const columnDefs = computed(() =>
  buildDynamicColumnDefs({
    columns: mappedColumns.value,
    rows: rows.value,
    columnKeyBy: 'field',
  })
);

const rowData = computed(() => buildDynamicRowData(rows.value));

const tableHeight = computed(
  () => `${getMongoInfoTableHeightPx(rows.value.length)}px`
);

onMounted(fetchIndexes);
</script>

<template>
  <div class="relative">
    <LoadingOverlay :visible="isLoading" />

    <div v-if="error" class="p-2">
      <Alert variant="destructive">
        <AlertDescription class="flex items-center justify-between gap-2">
          <span>{{ error }}</span>
          <Button variant="outline" size="xs" @click="fetchIndexes">
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    </div>

    <div
      v-else-if="rows.length"
      :style="{
        maxHeight: `${MONGO_INFO_TABLE_MAX_HEIGHT_PX}px`,
        height: tableHeight,
      }"
    >
      <BaseDataGrid
        :column-defs="columnDefs"
        :row-data="rowData"
        :column-types="DYNAMIC_COLUMN_TYPES"
        class="h-full"
      />
    </div>

    <div v-else-if="!isLoading" class="flex items-center justify-center py-6">
      <BaseEmpty title="No Indexes" desc="This collection has no indexes." />
    </div>
  </div>
</template>
