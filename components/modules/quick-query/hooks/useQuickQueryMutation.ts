import { ref } from 'vue';
import { toast } from 'vue-sonner';
import { getConnectionParams } from '@/core/helpers/connection-helper';
import {
  HASH_INDEX_ID,
  NEW_ROW_FLAG_ID,
} from '~/components/base/dynamic-table/constants';
import { cellValueFormatter } from '~/components/base/dynamic-table/utils';
import {
  buildDeleteStatements,
  buildInsertStatements,
  buildUpdateStatements,
} from '~/components/modules/quick-query/utils';
import { copyRowsToClipboard } from '~/core/helpers';
import { type Connection } from '~/core/stores';
import type QuickQueryTable from '../quick-query-table/QuickQueryTable.vue';

/**
 * Interface for pagination details required by the hook.
 */
interface PaginationInfo {
  offset: number;
  limit: number;
}

interface EditedCellChange {
  rowId: number;
  changedData: Record<string, unknown>;
  isNewRow?: boolean;
}

/**
 * Options interface for the useQuickQueryMutation hook.
 */
interface UseQuickQueryMutationOptions {
  tableName: string;
  schemaName: string;
  primaryKeys: Ref<string[]>;
  columnNames: Ref<string[]>;
  data: Ref<Record<string, any>[] | undefined | null>;
  selectedRows: Ref<Record<string, any>[]>;
  pagination: PaginationInfo;
  addHistoryLog: (
    log: string,
    queryTime: number,
    data?: Record<string, any>,
    errorMessage?: string
  ) => void;
  refreshTableData: () => void;
  refreshCount: () => void;
  openErrorModal: Ref<boolean>;
  errorMessage: Ref<string | undefined>;
  quickQueryTableRef: Ref<InstanceType<typeof QuickQueryTable> | undefined>;
  focusedCell?: Ref<unknown | undefined>;
  safeModeEnabled?: Ref<boolean>;
  onRequestSafeModeConfirm?: (
    sql: string,
    type: 'save' | 'delete',
    dangerous?: boolean
  ) => Promise<boolean>;
  connection: Ref<Connection | undefined>;
}

/**
 * A composable hook for managing quick query table mutations (add, save, delete rows).
 *
 * @param options - Configuration options for the mutation operations.
 * @returns An object containing mutation functions and a loading state.
 */
export function useQuickQueryMutation(options: UseQuickQueryMutationOptions) {
  const {
    tableName,
    schemaName,
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
    focusedCell,
    safeModeEnabled,
    onRequestSafeModeConfirm,
    connection,
  } = options;

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

  const onFocusedCellChange = (cellValue: unknown | undefined) => {
    if (focusedCell) {
      focusedCell.value = cellValue;
    }
  };

  const getEditedCells = (): EditedCellChange[] => {
    return (quickQueryTableRef.value?.editedCells ?? []) as EditedCellChange[];
  };

  const getPendingEditedRows = () => {
    return getEditedCells().filter(cell => {
      return cell.isNewRow || Object.keys(cell.changedData).length > 0;
    });
  };

  /**
   * Saves changes made to table data, performing bulk inserts and/or updates via separate endpoints.
   */
  const onSaveData = async () => {
    const editedCells = getPendingEditedRows();

    if (!data.value || !editedCells.length) {
      toast.info('No changes to save.');
      return;
    }

    const updates: {
      pKeyValue: Record<string, unknown>;
      update: Record<string, unknown>;
    }[] = [];
    const insertItems: Record<string, unknown>[] = [];
    const previewStatements: string[] = [];
    let hasNoPkWarning = false;

    editedCells.forEach(cell => {
      const haveDifferent = !!Object.keys(cell.changedData).length;
      const rowData = data.value?.[cell.rowId];

      const isUpdate = haveDifferent && rowData && !cell.isNewRow;
      const isInsert = cell.isNewRow || (!rowData && haveDifferent);

      if (isUpdate) {
        const { sql, noPkWarning } = buildUpdateStatements({
          tableName,
          schemaName,
          update: cell.changedData,
          pKeys: primaryKeys.value,
          pKeyValue: rowData,
          dbType: connection.value?.type,
        });
        if (noPkWarning) hasNoPkWarning = true;
        updates.push({ pKeyValue: rowData, update: cell.changedData });
        previewStatements.push(sql);
      } else if (isInsert) {
        insertItems.push(cell.changedData);
        previewStatements.push(
          buildInsertStatements({
            tableName,
            schemaName,
            insertData: cell.changedData,
            dbType: connection.value?.type,
          })
        );
      }
    });

    if (!updates.length && !insertItems.length) {
      toast.info('No valid changes to save.');
      return;
    }

    // Danger confirmation: no PK — WHERE clause matches by all columns and may
    // affect multiple rows. Show the generated SQL so the user knows exactly
    // what will run.
    if (hasNoPkWarning && onRequestSafeModeConfirm) {
      const confirmed = await onRequestSafeModeConfirm(
        previewStatements.join('\n'),
        'save',
        true
      );
      if (!confirmed) return;
    }

    // Safe mode confirmation (skip if already confirmed via no-PK warning above)
    if (!hasNoPkWarning && safeModeEnabled?.value && onRequestSafeModeConfirm) {
      const confirmed = await onRequestSafeModeConfirm(
        previewStatements.join('\n'),
        'save'
      );
      if (!confirmed) return;
    }

    isMutating.value = true;

    const connParams = getConnectionParams(connection.value);
    const baseBody = { tableName, schemaName, ...connParams };

    const handleResponseError = (label: string) => ({
      onResponseError({ response }: { response: any }) {
        const errorData = response?._data?.data?.driverError;
        const message = response?._data?.message as string;
        openErrorModal.value = true;
        console.error(`Error during ${label}:`, response?._data);
        errorMessage.value =
          message || `An unknown error occurred during ${label}.`;
        addHistoryLog(previewStatements.join('\n'), 0, errorData, message);
      },
    });

    try {
      const requests: Promise<{ queryTime: number }>[] = [];

      if (updates.length) {
        requests.push(
          $fetch<{ queryTime: number }>('/api/tables/bulk-update', {
            method: 'POST',
            body: { ...baseBody, pKeys: primaryKeys.value, updates },
            ...handleResponseError('bulk update'),
          })
        );
      }

      if (insertItems.length) {
        requests.push(
          $fetch<{ queryTime: number }>('/api/tables/bulk-insert', {
            method: 'POST',
            body: { ...baseBody, insertItems },
            ...handleResponseError('bulk insert'),
          })
        );
      }

      const results = await Promise.all(requests);
      const totalQueryTime = results.reduce(
        (sum, r) => sum + (r.queryTime ?? 0),
        0
      );

      if (quickQueryTableRef.value?.editedCells) {
        quickQueryTableRef.value.editedCells = [];
      }
      addHistoryLog(previewStatements.join('\n'), totalQueryTime);
      refreshCount();
      refreshTableData();
      toast.success('Data saved successfully!');
    } catch (error) {
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

    // Build per-row DELETE SQL for preview in confirmation modals
    const deleteStatements = selectedRows.value.map(row =>
      buildDeleteStatements({
        schemaName,
        tableName,
        pKeys: primaryKeys.value,
        pKeyValue: row,
        dbType: connection.value?.type,
      })
    );

    const hasNoPkWarning = deleteStatements.some(r => r.noPkWarning);
    const previewDeleteSql = deleteStatements.map(r => r.sql).join('\n');

    // Danger confirmation: no PK — WHERE clause matches by all columns and may
    // affect multiple rows. Show the generated SQL so the user knows exactly
    // what will run.
    if (hasNoPkWarning && onRequestSafeModeConfirm) {
      const confirmed = await onRequestSafeModeConfirm(
        previewDeleteSql,
        'delete',
        true
      );
      if (!confirmed) return;
    }

    // Safe mode confirmation (skip if already confirmed via no-PK warning above)
    if (!hasNoPkWarning && safeModeEnabled?.value && onRequestSafeModeConfirm) {
      const confirmed = await onRequestSafeModeConfirm(
        previewDeleteSql,
        'delete'
      );
      if (!confirmed) {
        return;
      }
    }

    isMutating.value = true;

    try {
      const { queryTime } = await $fetch('/api/tables/bulk-delete', {
        method: 'POST',
        body: {
          tableName,
          schemaName,
          pKeys: primaryKeys.value,
          pKeyValues: selectedRows.value,
          ...getConnectionParams(connection.value),
        },
        onResponseError({ response }) {
          const errorData = response?._data?.data?.driverError;
          const message = response?._data?.message as string;
          openErrorModal.value = true;
          errorMessage.value =
            message || 'An unknown error occurred during deletion.';

          addHistoryLog(previewDeleteSql, 0, errorData, message);
        },
      });

      // Adjust pagination offset if all rows on the current page are deleted
      const isDeleteAllRowsInPage =
        selectedRows.value?.length === data.value?.length;
      if (isDeleteAllRowsInPage && pagination.offset > 0) {
        const newOffset = pagination.offset - pagination.limit;
        pagination.offset = newOffset > 0 ? newOffset : 0;
      }

      addHistoryLog(previewDeleteSql, queryTime || 0);
      refreshCount();
      refreshTableData();
      toast.success('Rows deleted successfully!');
    } catch (error) {
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
    const rowId = addIndex;

    const newNode = {
      [HASH_INDEX_ID]: addIndex + 1, // Assign an artificial row number for display
      [NEW_ROW_FLAG_ID]: true,
      ...Object.fromEntries(columnNames.value.map(name => [name, undefined])), // Initialize all columns with undefined
    };

    gridApi.applyTransaction({
      add: [newNode],
      addIndex,
    });

    const editedCells = getEditedCells();

    if (!quickQueryTableRef.value?.editedCells) {
      return;
    }

    quickQueryTableRef.value.editedCells = [
      ...editedCells,
      {
        rowId,
        changedData: {},
        isNewRow: true,
      },
    ];

    // Set focus and select the newly added row for immediate editing
    gridApi.setFocusedCell(addIndex, columnNames.value[0]);
    // Note: getRowNode by index is still okay here for initial focus as it's just added at the end
    const currentAddedRow = gridApi.getDisplayedRowAtIndex(addIndex);
    if (currentAddedRow) {
      gridApi.deselectAll();
      currentAddedRow.setSelected(true);
    }
  };

  const onDiscardChanges = () => {
    if (!quickQueryTableRef.value || !getPendingEditedRows().length) {
      return;
    }

    quickQueryTableRef.value.editedCells = [];
    onRefresh();
    toast.info('Changes discarded.');
  };

  const pendingChangesCount = computed(() => {
    return getPendingEditedRows().length;
  });

  const hasEditedRows = computed(() => {
    return pendingChangesCount.value > 0;
  });

  const onCopyRows = () => {
    const rows = selectedRows.value;

    if (!rows) {
      return;
    }

    const mappedRows = rows
      .map(row => {
        if (row[NEW_ROW_FLAG_ID]) {
          return row;
        }

        return row;
      })
      .filter(Boolean) as Record<string, any>[];

    copyRowsToClipboard(mappedRows);
  };

  const onCopySelectedCell = async () => {
    if (focusedCell?.value) {
      await navigator.clipboard.writeText(
        cellValueFormatter(focusedCell.value) || ''
      );
    }
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
  };

  const onDeselectAll = () => {
    const gridApi = quickQueryTableRef.value?.gridApi;

    if (!gridApi) {
      return;
    }

    // gridApi.deselectAll();
  };

  return {
    onAddEmptyRow,
    onDiscardChanges,
    onDeleteRows,
    onSaveData,
    isMutating, // Expose the mutation loading state
    hasEditedRows,
    pendingChangesCount,
    onCopyRows,
    onPasteRows,
    onRefresh,
    onSelectedRowsChange,
    onCopySelectedCell,
    onFocusedCellChange,
    onDeselectAll,
  };
}
