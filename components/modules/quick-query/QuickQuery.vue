<script setup lang="ts">
import { toast } from 'vue-sonner';
import { useTableQueryBuilder } from '~/composables/useTableQueryBuilder';
import { useAppContext } from '~/shared/contexts/useAppContext';
import { EDatabaseType } from '../management-connection/constants';
import QuickQueryErrorPopup from './QuickQueryErrorPopup.vue';
import QuickQueryTable from './QuickQueryTable.vue';
import QuickQueryControlBar from './quick-query-control-bar/QuickQueryControlBar.vue';
import QuickQueryFilter from './quick-query-filter/QuickQueryFilter.vue';

definePageMeta({
  keepalive: false,
});

const quickQueryFilterRef = ref<InstanceType<typeof QuickQueryFilter>>();

const props = defineProps<{ tableId: string }>();

const { connectionStore } = useAppContext();

const {
  status,
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

const {
  data: tableSchema,
  status: tableSchemaStatus,
  error: tableSchemaError,
} = await useFetch('/api/get-one-table', {
  method: 'POST',
  body: {
    tableName: props.tableId,
    connectionUrl: connectionStore.selectedConnection?.connectionString,
  },
  key: `schema-${props.tableId}`,
  onRequestError({ request, options, error }) {
    // Handle the request errors
  },
  onResponse({ request, response, options }) {
    // Process the response data
    // localStorage.setItem('token', response._data.token);
  },
  onResponseError({ request, response, options }) {
    toast(response?.statusText);
  },
});

const columnNames = computed(() => {
  return tableSchema.value?.columns?.map(c => c.name) || [];
});

onMounted(() => {
  refreshCount();
  refreshTableData();
});
</script>

<template>
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
      @update:order-by="onUpdateOrderBy"
      class="h-fit max-h-full"
      :defaultPageSize="DEFAULT_QUERY_SIZE"
    />

    <QuickQueryControlBar
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
      @on-show-filter="
        async () => {
          await quickQueryFilterRef?.onShowSearch();
        }
      "
    />
  </div>
</template>
