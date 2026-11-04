import type { ColDef, ValueFormatterParams } from 'ag-grid-community';
import { formatCellValue } from '~/core/helpers/cell-value';
import {
  DEFAULT_COLUMN_ADDITIONAL_GAP_WIDTH,
  DEFAULT_COLUMN_RAW_GAP_WIDTH,
  DEFAULT_HASH_INDEX_WIDTH,
  HASH_INDEX_HEADER,
  HASH_INDEX_ID,
} from '../constants';
import { estimateColumnWidth } from './calculateColumnWidths';

type GridRowData = Record<string, unknown>;

export function createHashIndexColumnDef(
  overrides: Partial<ColDef> = {}
): ColDef {
  return {
    colId: HASH_INDEX_ID,
    headerName: HASH_INDEX_HEADER,
    field: HASH_INDEX_ID,
    filter: false,
    resizable: false,
    editable: false,
    sortable: true,
    pinned: 'left',
    width: DEFAULT_HASH_INDEX_WIDTH,
    ...overrides,
  };
}

export function estimateGridColumnWidth({
  headerName,
  rows,
  field,
  isKey = false,
}: {
  headerName: string;
  rows: GridRowData[];
  field: string;
  isKey?: boolean;
}) {
  const additionalGap = isKey ? DEFAULT_COLUMN_ADDITIONAL_GAP_WIDTH : 0;

  return (
    estimateColumnWidth({
      headerName,
      rows,
      field,
      gapWidth: DEFAULT_COLUMN_RAW_GAP_WIDTH,
    }) + additionalGap
  );
}

export function formatGridCellValue(params: ValueFormatterParams) {
  return formatCellValue(
    params,
    typeof params.value === 'object' && params.value !== null
  );
}
