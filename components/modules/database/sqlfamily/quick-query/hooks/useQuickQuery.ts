import type QuickQueryFilter from '../quick-query-filter/QuickQueryFilter.vue';
import type QuickQueryTable from '../quick-query-table/QuickQueryTable.vue';

export const useQuickQuery = () => {
  const quickQueryFilterRef = ref<InstanceType<typeof QuickQueryFilter>>();
  const quickQueryTableRef = ref<InstanceType<typeof QuickQueryTable>>();
  const selectedRows = ref<Record<string, any>[]>([]);
  const focusedCell = ref<unknown | undefined>(undefined);
  const isMutating = ref(false);

  return {
    quickQueryFilterRef,
    quickQueryTableRef,
    selectedRows,
    isMutating,
    focusedCell,
  };
};
