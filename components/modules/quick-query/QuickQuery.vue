<script setup lang="ts">
import { toast } from 'vue-sonner';
import { useTableQueryBuilder } from '~/composables/useTableQueryBuilder';
import { useAppContext } from '~/shared/contexts/useAppContext';
import { buildUpdateQuery, findDifferentChange } from '~/utils/quickQuery';
import { EDatabaseType } from '../management-connection/constants';
import QuickQueryErrorPopup from './QuickQueryErrorPopup.vue';
import PreviewSelectedRow from './preview/PreviewSelectedRow.vue';
import QuickQueryControlBar from './quick-query-control-bar/QuickQueryControlBar.vue';
import QuickQueryFilter from './quick-query-filter/QuickQueryFilter.vue';
import QuickQueryTable from './quick-query-table/QuickQueryTable.vue';

definePageMeta({
  keepalive: false,
});

const quickQueryFilterRef = ref<InstanceType<typeof QuickQueryFilter>>();

const props = defineProps<{ tableId: string }>();

const { connectionStore } = useAppContext();

const {
  onApplyNewFilter,
  data,
  baseQueryString,
  refreshTableData,
  refreshCount,
  isAllowNextPage,
  isAllowPreviousPage,
  onNextPage,
  onPreviousPage,
  onUpdatePagination,
  totalRows,
  pagination,
  error,
  openErrorModal,
  orderBy,
  onUpdateOrderBy,
} = await useTableQueryBuilder({
  connectionString: connectionStore.selectedConnection?.connectionString || '',
  tableName: props.tableId,
});

const { data: tableSchema, status: tableSchemaStatus } = await useFetch(
  '/api/get-one-table',
  {
    method: 'POST',
    body: {
      tableName: props.tableId,
      connectionUrl: connectionStore.selectedConnection?.connectionString,
    },
    key: `schema-${props.tableId}`,
    onResponseError({ response }) {
      toast(response?.statusText);
    },
  }
);

const selectedRows = ref<Record<string, any>[]>([]);

const columnNames = computed(() => {
  return tableSchema.value?.columns?.map(c => c.name) || [];
});

onMounted(() => {
  refreshCount();
  refreshTableData();
});

const foreignKeys = computed(() =>
  (tableSchema.value?.foreign_keys || []).map(fk => fk.column)
);
const primaryKeys = computed(() =>
  (tableSchema.value?.primary_keys || []).map(fk => fk.column)
);

const columnTypes = computed(() => {
  return (
    tableSchema.value?.columns?.map(c => ({
      name: c.name,
      type: c.short_type_name,
    })) || []
  );
});

const onSelectedRowsChange = (rows: Record<string, any>[]) => {
  selectedRows.value = rows;
};

const onSaveData = async () => {
  if (!data.value) {
    return;
  }

  const tableName = props.tableId;

  const differentChange = findDifferentChange(
    data.value[0],
    selectedRows.value[0]
  );

  const queryUpdateString = buildUpdateQuery({
    tableName: tableName,
    pKeys: primaryKeys.value,
    update: differentChange,
    pKeyValue: selectedRows.value[0],
  });

  console.log('onSaveData::', queryUpdateString);

  await $fetch('/api/execute', {
    method: 'POST',
    body: {
      query: queryUpdateString,
      connectionUrl: connectionStore.selectedConnection?.connectionString,
    },
    onResponseError({ response }) {
      toast(response?.statusText);
    },
  });

  refreshTableData();
};
</script>

<template>
  <!-- TODO: add menu context for table -->
  <!-- TODO: Allow delete , delete many -->
  <!-- TODO: Allow add row  -->
  <!-- TODO: Allow edit row  -->
  <!-- TODO: sync data when edit to row table -->
  <!-- TODO: allow save data in control bar -> sync button -> trigger call api -->
  <Teleport defer to="#preview-select-row">
    <PreviewSelectedRow
      :columnTypes="columnTypes"
      :selectedRow="selectedRows?.length ? selectedRows[0] : null"
  /></Teleport>

  <QuickQueryErrorPopup
    v-model:open="openErrorModal"
    :message="error?.statusMessage || ''"
  />

  <div class="flex flex-col h-full w-full relative p-2">
    <!-- <LoadingOverlay :visible="status === 'pending'" /> -->
    <LoadingOverlay :visible="tableSchemaStatus === 'pending'" />
    <TableSkeleton v-if="tableSchemaStatus === 'pending'" />

    <QuickQueryFilter
      ref="quickQueryFilterRef"
      @onSearch="
        whereClause => {
          console.log('🚀 ~ whereClause:', whereClause);

          onApplyNewFilter(whereClause);
        }
      "
      :baseQuery="baseQueryString"
      :columns="columnNames"
      :dbType="EDatabaseType.PG"
    />

    <QuickQueryTable
      :data="data || []"
      :orderBy="orderBy"
      @on-selected-rows="onSelectedRowsChange"
      @update:order-by="onUpdateOrderBy"
      class="h-fit max-h-full"
      :foreignKeys="foreignKeys"
      :primaryKeys="primaryKeys"
      :columnTypes="columnTypes"
      :defaultPageSize="DEFAULT_QUERY_SIZE"
      :offset="pagination.offset"
    />

    <QuickQueryControlBar
      :total-selected-rows="selectedRows?.length"
      :isAllowNextPage="isAllowNextPage"
      :isAllowPreviousPage="isAllowPreviousPage"
      :totalRows="totalRows"
      :limit="pagination.limit"
      :currentTotalRows="data?.length || 0"
      :offset="pagination.offset"
      @onPaginate="onUpdatePagination"
      @onNextPage="onNextPage"
      @onPreviousPage="onPreviousPage"
      @onRefresh="refreshTableData"
      @onSaveData="onSaveData"
      @on-show-filter="
        async () => {
          await quickQueryFilterRef?.onShowSearch();
        }
      "
    />
  </div>
</template>
