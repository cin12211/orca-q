import { computed, ref, watch, type Ref } from 'vue';
import type {
  CellClassParams,
  ColDef,
  ColTypeDef,
  GridOptions,
} from 'ag-grid-community';
import AgJsonCellEditor from '~/components/base/data-grid/components/AgJsonCellEditor.vue';
import { useTableTheme } from '~/components/base/data-grid/hooks';
import type { RowData } from '~/components/base/data-grid/utils';
import { DEFAULT_BUFFER_ROWS, DEFAULT_QUERY_SIZE } from '~/core/constants';
import { areCellValuesDifferent } from '~/core/helpers/cell-value';
import CustomHeaderTable from '../quick-query-table/CustomHeaderTable.vue';
import { suppressDeleteKeyboardEvent } from '../utils/quickQueryTable';

interface UseQuickQueryGridOptionsOptions {
  defaultPageSize?: number;
  data: Ref<RowData[] | undefined>;
  selectedColumnFieldId: Ref<string | undefined>;
  isJSONColumn: (fieldId: string) => boolean;
  gridApi: Ref<any>;
  /**
   * Optional. When using `BaseDataGrid`, range-selection mouse handlers are
   * managed by the underlying grid wrapper and should not be overridden
   * here. Leave undefined to let the wrapper own them.
   */
  onCellMouseDown?: GridOptions['onCellMouseDown'];
  onCellMouseOver?: GridOptions['onCellMouseOver'];
}

export const useQuickQueryGridOptions = ({
  defaultPageSize,
  data,
  selectedColumnFieldId,
  isJSONColumn,
  gridApi,
  onCellMouseDown,
  onCellMouseOver,
}: UseQuickQueryGridOptionsOptions) => {
  const pageSize = ref<number>(defaultPageSize ?? DEFAULT_QUERY_SIZE);
  const defaultColDef = ref<ColDef>({
    headerComponent: CustomHeaderTable,
    suppressKeyboardEvent: suppressDeleteKeyboardEvent,
  });
  const columnTypes = ref<Record<string, ColTypeDef>>({
    editableColumn: {
      cellStyle: (params: CellClassParams) => {
        const field = params.colDef.colId ?? '';

        if (!field || !data.value) {
          return undefined;
        }

        const rowId = Number(params.node.id ?? params.node.rowIndex);
        const originalRowData = data.value[rowId];

        if (originalRowData === undefined) {
          return { backgroundColor: 'var(--color-green-100)' };
        }

        const style: { backgroundColor?: string; color?: string } = {};
        const originalFieldValue = originalRowData[field];
        const newValue = params.value;

        if (originalFieldValue === null || newValue === null) {
          style.color = 'var(--muted-foreground)';
        }

        const isChanged = areCellValuesDifferent({
          oldValue: originalFieldValue,
          newValue,
          isObjectColumn: isJSONColumn(field),
        });

        if (isChanged) {
          style.backgroundColor = 'var(--color-orange-200)';
          delete style.color;
        } else {
          style.backgroundColor = 'unset';
        }

        return style;
      },
      cellClass: (params: CellClassParams) => {
        const isSelectedCol =
          params.column.getColId() === selectedColumnFieldId.value;
        return isSelectedCol ? 'col-highlight-cell cellCenter' : 'cellCenter';
      },
    },
  });

  const tableTheme = useTableTheme();

  watch(tableTheme, newTheme => {
    gridApi.value?.updateGridOptions({ theme: newTheme });
  });

  const gridOptions = computed<GridOptions>(() => {
    const opts: GridOptions = {
      components: {
        AgJsonCellEditor,
      },
      paginationPageSize: pageSize.value,
      rowBuffer: DEFAULT_BUFFER_ROWS,
      rowClass: 'class-row-border-none',
      getRowStyle: params => {
        if ((params.node.rowIndex || 0) % 2 === 0) {
          return { background: 'var(--muted)' };
        }
      },
      rowSelection: {
        mode: 'multiRow',
        checkboxes: false,
        headerCheckbox: false,
        enableSelectionWithoutKeys: false,
        enableClickSelection: 'enableSelection',
        copySelectedRows: false,
      },
      theme: tableTheme.value,
      pagination: false,
      undoRedoCellEditing: true,
      undoRedoCellEditingLimit: 25,
      animateRows: true,
      defaultColDef: defaultColDef.value,
      columnTypes: columnTypes.value,
    };

    // Only attach mouse handlers when the caller explicitly provides them;
    // otherwise leave them off so the underlying wrapper (e.g. BaseDataGrid)
    // can own range-selection without being overridden.
    if (onCellMouseDown) opts.onCellMouseDown = onCellMouseDown;
    if (onCellMouseOver) opts.onCellMouseOver = onCellMouseOver;

    return opts;
  });

  return {
    pageSize,
    defaultColDef,
    columnTypes,
    tableTheme,
    gridOptions,
  };
};
