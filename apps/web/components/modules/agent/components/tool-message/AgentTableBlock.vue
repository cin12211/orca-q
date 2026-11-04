<script setup lang="ts">
import {
  buildDynamicColumnDefs,
  buildDynamicRowData,
  DYNAMIC_COLUMN_TYPES,
} from '~/components/base/data-grid/utils';
import type { MappedRawColumn } from '~/core/types/mapped-column.types';
import type { AgentRenderTableResult } from '../../types';
import AgentToolSqlPreview from './AgentToolSqlPreview.vue';

const props = defineProps<{
  data: AgentRenderTableResult;
}>();

const mappedColumns = computed<MappedRawColumn[]>(() =>
  (props.data.columns ?? []).map(column => ({
    originalName: column.name,
    queryFieldName: column.name,
    aliasFieldName: column.name,
    isPrimaryKey: false,
    isForeignKey: false,
    canMutate: false,
    type: column.type,
    tableName: '',
  }))
);

const rows = computed(() => props.data.rows ?? []);

const columnDefs = computed(() =>
  buildDynamicColumnDefs({
    columns: mappedColumns.value,
    rows: rows.value,
    columnKeyBy: 'field',
    hasHashIndex: false,
  })
);

const rowData = computed(() => buildDynamicRowData(rows.value, false));
const sqlPreviewId = computed(
  () => `agent-render-table-${props.data.sql || ''}`
);

const tableHeight = computed(() => {
  const ROW_HEIGHT = 32;
  const HEADER_HEIGHT = 48;
  const MIN_HEIGHT = 120;
  const MAX_HEIGHT = 420;
  const calculatedHeight = HEADER_HEIGHT + rows.value.length * ROW_HEIGHT;

  return Math.max(MIN_HEIGHT, Math.min(calculatedHeight, MAX_HEIGHT));
});
</script>

<template>
  <AgentToolSqlPreview
    v-if="data.sql"
    :id="sqlPreviewId"
    :sql="data.sql"
    label="View SQL"
  />

  <div
    v-if="data.truncated"
    class="text-xs text-muted-foreground border-l-2 pl-2 mb-1"
  >
    Showing only the first {{ data.rowCount }} rows.
  </div>

  <div
    class="overflow-hidden rounded-lg border max-h-96"
    :style="{ height: `${tableHeight}px` }"
  >
    <BaseDataGrid
      :column-defs="columnDefs"
      :row-data="rowData"
      :column-types="DYNAMIC_COLUMN_TYPES"
      class="h-full w-full"
    />
  </div>

  <div class="text-xs text-muted-foreground mt-1">
    Showing {{ rows.length }} row{{ rows.length === 1 ? '' : 's' }}
  </div>
</template>
