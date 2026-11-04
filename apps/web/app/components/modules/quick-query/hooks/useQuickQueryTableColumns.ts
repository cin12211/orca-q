import type QuickQueryTable from '../quick-query-table/QuickQueryTable.vue';

export const useQuickQueryTableColumns = (
  quickQueryTableRef: Ref<InstanceType<typeof QuickQueryTable> | undefined>
) => {
  const columns = ref();

  watch(
    () => quickQueryTableRef.value?.columnDefs,
    () => {
      if (quickQueryTableRef.value?.columnDefs) {
        columns.value = quickQueryTableRef.value.columnDefs;
      }
    },
    { immediate: true, deep: true }
  );

  return {
    columns,
  };
};
