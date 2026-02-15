import type QuickQueryTable from '~/components/modules/quick-query/quick-query-table/QuickQueryTable.vue';

type TableActionsProps = {
  quickQueryTableRef: Ref<InstanceType<typeof QuickQueryTable> | undefined>;
};

export const useTableActions = ({ quickQueryTableRef }: TableActionsProps) => {
  const selectedColumnFieldId = ref<string | undefined>(undefined);

  const resetGridState = () => {
    selectedColumnFieldId.value = undefined;

    quickQueryTableRef.value?.gridApi?.ensureIndexVisible?.(0, 'top');
    quickQueryTableRef.value?.gridApi?.refreshHeader();
    quickQueryTableRef.value?.gridApi?.refreshCells({ force: true });
  };

  const onJumpToSelectedColumn = (fieldId: string | undefined) => {
    if (!fieldId) return;

    quickQueryTableRef.value?.gridApi?.ensureColumnVisible(fieldId, 'middle');
    quickQueryTableRef.value?.gridApi?.refreshCells({ force: true });
    quickQueryTableRef.value?.gridApi?.refreshHeader();
  };

  const handleSelectColumn = (fieldId: string | undefined) => {
    selectedColumnFieldId.value = fieldId;
    onJumpToSelectedColumn(fieldId);
  };

  return {
    resetGridState,
    selectedColumnFieldId,
    handleSelectColumn,
  };
};
