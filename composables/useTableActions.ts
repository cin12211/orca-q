import { _debounce } from 'ag-grid-community';
import type QuickQueryTable from '../components/modules/quick-query/quick-query-table/QuickQueryTable.vue';

type TableActionsProps = {
  quickQueryTableRef: Ref<InstanceType<typeof QuickQueryTable> | undefined>;
};

export const useTableActions = ({ quickQueryTableRef }: TableActionsProps) => {
  const selectedColumnFieldId = ref<string | undefined>(undefined);

  const resetGridState = () => {
    selectedColumnFieldId.value = undefined;
    quickQueryTableRef.value?.gridApi?.stopEditing(true);
    quickQueryTableRef.value?.gridApi?.clearFocusedCell?.();
    quickQueryTableRef.value?.gridApi?.deselectAll?.();
    quickQueryTableRef.value?.gridApi?.setFilterModel(null);
    quickQueryTableRef.value?.gridApi?.resetColumnState();
    quickQueryTableRef.value?.gridApi?.ensureIndexVisible?.(0, 'top');
    quickQueryTableRef.value?.gridApi?.refreshHeader();
    quickQueryTableRef.value?.gridApi?.refreshCells({ force: true });
  };

  const onJumpToSelectedColumn = (fieldId: string | undefined) => {
    quickQueryTableRef.value?.gridApi?.ensureColumnVisible(fieldId!, 'middle');
    quickQueryTableRef.value?.gridApi?.refreshCells({ force: true });
    quickQueryTableRef.value?.gridApi?.refreshHeader();
  };

  const handleSelectColumn = _debounce(
    { isAlive: () => true },
    (fieldId: string | undefined) => {
      selectedColumnFieldId.value = fieldId;
      onJumpToSelectedColumn(fieldId);
    },
    200
  );

  return {
    resetGridState,
    selectedColumnFieldId,
    handleSelectColumn,
  };
};
