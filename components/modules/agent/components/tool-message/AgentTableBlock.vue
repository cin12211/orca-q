<script setup lang="ts">
import DynamicTable from '~/components/base/dynamic-table/DynamicTable.vue';
import type { MappedRawColumn } from '~/components/modules/raw-query/interfaces';
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
    class="text-xs text-muted-foreground border-l-2 pl-2"
  >
    Showing only the first {{ data.rowCount }} rows.
  </div>

  <div
    class="overflow-hidden rounded-lg border max-h-96"
    :style="{ height: `${tableHeight}px` }"
  >
    <DynamicTable
      :columns="mappedColumns"
      :data="rows"
      column-key-by="field"
      :has-hash-index="false"
      class="h-full w-full"
    />
  </div>

  <div class="text-xs text-muted-foreground">
    Showing {{ rows.length }} row{{ rows.length === 1 ? '' : 's' }}
  </div>
</template>
