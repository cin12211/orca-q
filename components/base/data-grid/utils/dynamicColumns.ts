/**
 * Pure helpers that convert `MappedRawColumn[]` + `RowData[]` into the
 * `ColDef[]` / `RowData[]` that `BaseDataGrid` expects.
 *
 * Extracted from the old `DynamicTable.vue` so every consumer can reuse
 * the same column-building logic without coupling to a specific wrapper
 * component.
 */
import type {
  CellClassParams,
  ColDef,
  ColTypeDef,
  ICellEditorParams,
  ValueSetterParams,
} from 'ag-grid-community';
import DataGridKeyHeader from '~/components/base/data-grid/headers/DataGridKeyHeader.vue';
import type { MappedRawColumn } from '~/core/types/mapped-column.types';
import { HASH_INDEX_ID } from '../constants';
import type { RowData } from './cellValueFormatter';
import {
  createHashIndexColumnDef,
  estimateGridColumnWidth,
  formatGridCellValue,
} from './gridColumnDefs';

export type { MappedRawColumn };

/* ------------------------------------------------------------------ *
 * buildDynamicColumnDefs — build ColDef[] from MappedRawColumn[]
 * ------------------------------------------------------------------ */

export interface BuildDynamicColumnDefsOptions {
  columns: MappedRawColumn[];
  rows: RowData[];
  columnKeyBy: 'index' | 'field';
  hasHashIndex?: boolean;
  getCellClass?: (field: string, row: RowData) => string | undefined;
}

export function buildDynamicColumnDefs({
  columns,
  rows,
  columnKeyBy,
  hasHashIndex = true,
  getCellClass,
}: BuildDynamicColumnDefsOptions): ColDef[] {
  if (!columns?.length) {
    return [];
  }

  const colDefs: ColDef[] = [];

  if (hasHashIndex) {
    colDefs.push(createHashIndexColumnDef());
  }

  const tempRows = (rows || []).slice(0, 10);

  columns.forEach(
    ({ originalName, isPrimaryKey, isForeignKey, aliasFieldName }, index) => {
      const fieldId = columnKeyBy === 'index' ? `${index}` : originalName;
      const headerName = aliasFieldName;
      const estimatedWidth = estimateGridColumnWidth({
        headerName,
        rows: tempRows,
        field: fieldId,
        isKey: isPrimaryKey || isForeignKey,
      });

      const column: ColDef = {
        headerName,
        field: fieldId,
        filter: true,
        resizable: true,
        editable: true,
        sortable: true,
        type: 'editableColumn',
        headerComponentParams: {
          innerHeaderComponent: DataGridKeyHeader,
          isPrimaryKey,
          isForeignKey,
        },
        cellClass: getCellClass
          ? (params: CellClassParams) => {
              const field = String(params.colDef.field || '');
              const customClass = getCellClass(field, params.data as RowData);
              return customClass ? `cellCenter ${customClass}` : 'cellCenter';
            }
          : 'cellCenter',
        cellEditorSelector: (params: ICellEditorParams) => {
          const value = params.data[fieldId];
          if (typeof value === 'object' && value !== null) {
            return {
              component: 'AgJsonCellEditor',
              popup: true,
              popupPosition: 'under',
            };
          }
        },
        valueFormatter: formatGridCellValue,
        valueSetter: (params: ValueSetterParams) => {
          try {
            const newValue = JSON.parse(params.newValue);
            params.data[fieldId] = newValue;
            return true;
          } catch {
            return false;
          }
        },
        width: estimatedWidth,
      };

      colDefs.push(column);
    }
  );

  return colDefs;
}

/* ------------------------------------------------------------------ *
 * buildDynamicRowData — prepend hash-index column to each row
 * ------------------------------------------------------------------ */

export function buildDynamicRowData(
  data: RowData[] | undefined,
  hasHashIndex = true
): unknown[] {
  if (!data) return [];
  if (!hasHashIndex) return data;

  return data.map((row, index) => ({
    [HASH_INDEX_ID]: index + 1,
    ...row,
  }));
}

/* ------------------------------------------------------------------ *
 * DYNAMIC_COLUMN_TYPES — shared column type definitions used by the
 * old DynamicTable. Consumers can pass these as `columnTypes` prop to
 * BaseDataGrid to get the same cell-styling behaviour.
 * ------------------------------------------------------------------ */

export const DYNAMIC_COLUMN_TYPES: Record<string, ColTypeDef> = {
  indexColumn: {},
  editableColumn: {
    cellStyle: (params: CellClassParams) => {
      const field = params.colDef.field ?? '';
      if (!field) return undefined;

      const rowId = Number(params.node.id ?? params.node.rowIndex);
      const value = params.value;

      const style: { backgroundColor?: string; color?: string } = {};

      if (value === null) {
        style.color = 'var(--muted-foreground)';
      }

      return style;
    },
    cellClass: () => 'cellCenter',
  },
};
