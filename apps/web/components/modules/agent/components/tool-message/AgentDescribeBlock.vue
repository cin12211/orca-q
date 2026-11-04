<script setup lang="ts">
import {
  buildDynamicColumnDefs,
  buildDynamicRowData,
  DYNAMIC_COLUMN_TYPES,
} from '~/components/base/data-grid/utils';
import type { MappedRawColumn } from '~/core/types/mapped-column.types';
import type { AgentDescribeTableResult } from '../../types';

//TODO: this block not meaning must have same result with structure table
const props = defineProps<{
  data: AgentDescribeTableResult;
}>();

const mappedColumns = computed<MappedRawColumn[]>(() =>
  [
    ['name', 'Name'],
    ['type', 'Type'],
    ['nullable', 'Nullable'],
    ['pk', 'PK'],
    ['fk', 'FK'],
    ['references', 'References'],
    ['description', 'Description'],
  ].map(([key, label]) => ({
    originalName: key,
    queryFieldName: key,
    aliasFieldName: label,
    isPrimaryKey: false,
    isForeignKey: false,
    canMutate: false,
    type: 'text',
    tableName: '',
  }))
);

const rows = computed(() =>
  props.data.columns.map(column => ({
    name: column.name,
    type: column.type,
    nullable: column.isNullable ? 'Yes' : 'No',
    pk: column.isPrimaryKey ? 'Yes' : 'No',
    fk: column.isForeignKey ? 'Yes' : 'No',
    references: column.referencesTable || '—',
    description: column.description || '—',
  }))
);

const columnDefs = computed(() =>
  buildDynamicColumnDefs({
    columns: mappedColumns.value,
    rows: rows.value,
    columnKeyBy: 'field',
    hasHashIndex: false,
  })
);

const rowData = computed(() => buildDynamicRowData(rows.value, false));

const tableHeight = computed(() => {
  const rowHeight = 32;
  const headerHeight = 48;
  const minHeight = 120;
  const maxHeight = 360;
  const calculatedHeight = headerHeight + rows.value.length * rowHeight;

  return Math.max(minHeight, Math.min(calculatedHeight, maxHeight));
});
</script>

<template>
  <!-- <div
    class="space-y-3 rounded-3xl border border-border/70 bg-muted/20 p-4"
  > -->
  <div class="flex items-start justify-between gap-3">
    <div class="space-y-2 min-w-0">
      <div class="flex items-center gap-2">
        <Icon name="hugeicons:grid-table" class="size-4 text-primary" />
        <div class="text-sm font-medium">
          {{ data.tableName }}
        </div>
      </div>

      <p class="text-sm leading-6">
        {{ data.summary }}
      </p>
    </div>

    <Badge variant="outline" class="shrink-0">
      {{ data.columns.length }} columns
    </Badge>
  </div>

  <div
    class="overflow-hidden rounded-lg border"
    :style="{ height: `${tableHeight}px` }"
  >
    <BaseDataGrid
      :column-defs="columnDefs"
      :row-data="rowData"
      :column-types="DYNAMIC_COLUMN_TYPES"
      class="h-full w-full"
    />
  </div>

  <div v-if="data.relatedTables.length > 0" class="space-y-2">
    <div class="text-[11px] font-medium text-muted-foreground">
      Related Tables
    </div>

    <div class="flex flex-wrap gap-1">
      <Badge
        v-for="table in data.relatedTables"
        :key="table"
        variant="outline"
        class="text-xxs"
      >
        {{ table }}
      </Badge>
    </div>
  </div>
  <!-- </div> -->
</template>
