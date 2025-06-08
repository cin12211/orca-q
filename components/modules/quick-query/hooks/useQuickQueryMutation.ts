import { toast } from 'vue-sonner';
import { useAppContext } from '~/shared/contexts/useAppContext';
import { copyRowsToClipboard } from '~/utils/common';
import { buildUpdateStatements } from '~/utils/quickQuery';
import { buildDeleteStatements } from '~/utils/quickQuery/buildDeleteStatements';
import { buildInsertStatements } from '~/utils/quickQuery/buildInsertStatements';
import type QuickQueryTable from '../quick-query-table/QuickQueryTable.vue';

// Adjust the path as per your project structure

/**
 * Interface for pagination details required by the hook.
 */
interface PaginationInfo {
  offset: number;
  limit: number;
}

/**
 * Options interface for the useQuickQueryMutation hook.
 */
interface UseQuickQueryMutationOptions {
  tableId: string;
  primaryKeys: Ref<string[]>;
  columnNames: Ref<string[]>;
  data: Ref<Record<string, any>[] | undefined | null>;
  selectedRows: Ref<Record<string, any>[]>;
  pagination: PaginationInfo;
  addHistoryLog: (log: string) => void;
  refreshTableData: () => void;
  refreshCount: () => void;
  openErrorModal: Ref<boolean>;
  errorMessage: Ref<string | undefined>;
  quickQueryTableRef: Ref<InstanceType<typeof QuickQueryTable> | undefined>;
}

/**
 * A composable hook for managing quick query table mutations (add, save, delete rows).
 *
 * @param options - Configuration options for the mutation operations.
 * @returns An object containing mutation functions and a loading state.
 */
export function useQuickQueryMutation(options: UseQuickQueryMutationOptions) {
  const {
    tableId,
    primaryKeys,
    columnNames,
    data,
    selectedRows,
    pagination,
    addHistoryLog,
    refreshTableData,
    refreshCount,
    openErrorModal,
    errorMessage,
    quickQueryTableRef,
  } = options;

  const { connectionStore } = useAppContext();
  const isMutating = ref(false); // Reactive state for mutation loading indicator

  const onRefresh = async () => {
    const gridApi = quickQueryTableRef.value?.gridApi;

    if (!gridApi) {
      return;
    }

    gridApi?.deselectAll();
    gridApi?.clearFocusedCell();

    refreshCount();
    refreshTableData();
  };

  const onSelectedRowsChange = (rows: Record<string, any>[]) => {
    selectedRows.value = rows;
  };

  /**
   * Saves changes made to table data, performing bulk inserts or updates.
   */
  const onSaveData = async () => {
    if (!data.value || !quickQueryTableRef.value?.editedCells?.length) {
      toast.info('No changes to save.');
      return;
    }

    const editedCells = quickQueryTableRef.value?.editedCells;
    const tableName = tableId;
    const sqlBulkInsertOrUpdateStatements: string[] = [];

    editedCells.forEach(cell => {
      const haveDifferent = !!Object.keys(cell.changedData).length;
      const rowData = data.value?.[cell.rowId]; // Get existing row data if it's an update

      const isUpdateStatement = haveDifferent && rowData;
      const isInsertStatement = haveDifferent && !rowData; // Identify as new row if rowData is absent

      if (isUpdateStatement) {
        const sqlUpdateStatement = buildUpdateStatements({
          tableName: tableName,
          update: cell.changedData,
          pKeys: primaryKeys.value,
          pKeyValue: rowData,
        });
        sqlBulkInsertOrUpdateStatements.push(sqlUpdateStatement);
      } else if (isInsertStatement) {
        const sqlInsertStatement = buildInsertStatements({
          tableName: tableName,
          insertData: cell.changedData,
        });
        sqlBulkInsertOrUpdateStatements.push(sqlInsertStatement);
      }
    });

    if (!sqlBulkInsertOrUpdateStatements.length) {
      toast.info('No valid changes to save.');
      return;
    }

    isMutating.value = true;

    try {
      await $fetch('/api/execute-bulk-update', {
        method: 'POST',
        body: {
          sqlUpdateStatements: sqlBulkInsertOrUpdateStatements,
          dbConnectionString:
            connectionStore.selectedConnection?.connectionString,
        },
        onResponseError({ response }) {
          openErrorModal.value = true;
          console.error('Error during bulk update:', response?._data);
          errorMessage.value =
            response?._data?.message ||
            'An unknown error occurred during update.';
        },
      });

      if (quickQueryTableRef.value?.editedCells) {
        quickQueryTableRef.value.editedCells = []; // Clear edited cells after successful save
      }
      addHistoryLog(sqlBulkInsertOrUpdateStatements.join('\n'));
      refreshCount();
      refreshTableData();
      toast.success('Data saved successfully!');
    } catch (error) {
      // Error is primarily handled by onResponseError callback
      console.error('Fetch error in onSaveData:', error);
    } finally {
      isMutating.value = false;
    }
  };

  /**
   * Deletes selected rows from the table.
   */
  const onDeleteRows = async () => {
    if (!selectedRows.value.length) {
      toast.info('No rows selected for deletion.');
      return;
    }

    const sqlDeleteStatements: string[] = [];
    selectedRows.value.forEach(row => {
      const sqlDeleteStatement = buildDeleteStatements({
        tableName: tableId,
        pKeys: primaryKeys.value,
        pKeyValue: row,
      });
      sqlDeleteStatements.push(sqlDeleteStatement);
    });

    isMutating.value = true;

    try {
      await $fetch('/api/execute-bulk-delete', {
        method: 'POST',
        body: {
          sqlDeleteStatements,
          dbConnectionString:
            connectionStore.selectedConnection?.connectionString,
        },
        onResponseError({ response }) {
          openErrorModal.value = true;
          errorMessage.value =
            response?._data?.message ||
            'An unknown error occurred during deletion.';
          console.error('Error during bulk delete:', response?._data);
        },
      });

      // Adjust pagination offset if all rows on the current page are deleted
      const isDeleteAllRowsInPage =
        selectedRows.value?.length === data.value?.length;
      if (isDeleteAllRowsInPage && pagination.offset > 0) {
        const newOffset = pagination.offset - pagination.limit;
        pagination.offset = newOffset > 0 ? newOffset : 0;
      }

      addHistoryLog(sqlDeleteStatements.join('\n'));
      refreshCount();
      refreshTableData();
      toast.success('Rows deleted successfully!');
    } catch (error) {
      // Error is primarily handled by onResponseError callback
      console.error('Fetch error in onDeleteRows:', error);
    } finally {
      isMutating.value = false;
    }
  };

  /**
   * Adds an empty row to the table grid for new data entry.
   */
  const onAddEmptyRow = () => {
    const gridApi = quickQueryTableRef.value?.gridApi;
    if (!gridApi) {
      toast.error('Table grid API not available to add row.');
      return;
    }

    let totalRowsInGrid = 0;
    gridApi.forEachNode(() => totalRowsInGrid++);

    const addIndex = totalRowsInGrid; // Add the new row at the end of the current grid view
    const newNode = {
      '#': addIndex + 1, // Assign an artificial row number for display
      ...Object.fromEntries(columnNames.value.map(name => [name, undefined])), // Initialize all columns with undefined
    };

    gridApi.applyTransaction({
      add: [newNode],
      addIndex,
    });

    // Set focus and select the newly added row for immediate editing
    gridApi.setFocusedCell(addIndex, columnNames.value[0]);
    const currentAddedRow = gridApi.getRowNode(addIndex.toString()); // Row ID is its index string
    if (currentAddedRow) {
      gridApi.deselectAll();
      currentAddedRow.setSelected(true);
      toast.info('Empty row added. Please fill in data and save.');
    }
  };

  const hasEditedRows = computed(() => {
    let totalEditedRows = 0;

    quickQueryTableRef.value?.editedCells.forEach(cell => {
      if (Object.keys(cell.changedData).length) {
        totalEditedRows++;
      }
    });

    return !!totalEditedRows;
  });

  const onCopyRows = () => {
    const rows = selectedRows.value;

    if (!rows) {
      return;
    }

    const mappedRows = rows.map(row => {
      const index = (row?.['#'] || 1) - 1;

      return data.value?.[index];
    }) as Record<string, any>[];

    copyRowsToClipboard(mappedRows);
  };

  //TODO: make paste rows , in current cellIndex
  const onPasteRows = async () => {
    const gridApi = quickQueryTableRef.value?.gridApi;

    if (!gridApi) {
      return;
    }

    const currentCell = gridApi.getFocusedCell();

    if (!currentCell) {
      return;
    }

    const rowIndex = currentCell?.rowIndex;
    const columnName = currentCell?.column?.getColId();

    const clipboardData = await navigator.clipboard.readText();

    console.log(
      '🚀 ~ onPasteRows ~ currentCell:',
      columnName,
      rowIndex,
      clipboardData
    );
  };

  return {
    onAddEmptyRow,
    onDeleteRows,
    onSaveData,
    isMutating, // Expose the mutation loading state
    hasEditedRows,
    onCopyRows,
    onPasteRows,
    onRefresh,
    onSelectedRowsChange,
  };
}
