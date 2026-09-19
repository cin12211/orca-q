import type {
  CellClassParams,
  ColDef,
  EditableCallbackParams,
  ICellEditorParams,
  ValueFormatterParams,
  ValueSetterParams,
} from 'ag-grid-community';
import DataGridRelationCell from '~/components/base/data-grid/components/cell-renderers/DataGridRelationCell.vue';
import DataGridKeyHeader from '~/components/base/data-grid/headers/DataGridKeyHeader.vue';
import {
  createHashIndexColumnDef,
  estimateGridColumnWidth,
  type RowData,
} from '~/components/base/data-grid/utils';
import { formatCellValue, setCellValue } from '~/core/helpers/cell-value';
import {
  isJsonColumnType,
  isStructuredColumnType,
} from '~/core/helpers/sql-column-type';
import type { ReservedTableSchemas } from '~/core/types/database-tables.types';
import type { MappedRawColumn } from '../interfaces';
import type { RawQueryEditedCell } from './buildRawQueryUpdates';
import {
  groupColumnsByTable,
  isCellEditable,
  isColumnPotentiallyEditable,
} from './isCellEditable';
import { isRelationColumn } from './relationDetection';

/**
 * Mutable container passed to `buildRawQueryColumnDefs` so that `cellStyle`
 * callbacks can read the live dirty-cell set WITHOUT rebuilding column defs on
 * every edit. Mutate `.cells` in place (or replace the reference and call
 * `gridApi.refreshCells({ force: true })`) to reflect saves / discards.
 */
export interface RawQueryDirtyTracker {
  cells: RawQueryEditedCell[];
}

const SAMPLE_ROW_COUNT = 10;

/**
 * Format a raw-query cell for display. Mirrors the JSON-column detection used
 * by `cellEditorSelector` below — declared column type first, falling back to
 * the runtime value shape — so a jsonb/json column returned by the driver as
 * an already-stringified string still pretty-prints instead of falling
 * through to raw/escaped text.
 *
 * `formatCellValue` only pretty-prints a value it is handed directly as an
 * object, so a string value is parsed first; invalid JSON falls back to the
 * raw string rather than throwing.
 */
const formatRawQueryCellValue = (
  params: ValueFormatterParams,
  fieldType: string
) => {
  const { value } = params;
  const isObjectColumn =
    isJsonColumnType(fieldType) ||
    (typeof value === 'object' && value !== null);

  if (isObjectColumn && typeof value === 'string') {
    try {
      return formatCellValue({ ...params, value: JSON.parse(value) }, true);
    } catch {
      return value;
    }
  }

  return formatCellValue(params, isObjectColumn);
};

interface BuildRawQueryColumnDefsOptions {
  columns: MappedRawColumn[];
  rows: RowData[];
  reservedTables: ReservedTableSchemas[];
  /** When false the entire result is read-only regardless of column metadata. */
  isEditingEnabled: boolean;
  /**
   * Mutable tracker closed over by `cellStyle` callbacks. Mutate `.cells` and
   * call `gridApi.refreshCells({ force: true })` to repaint after save/discard.
   */
  dirtyTracker: RawQueryDirtyTracker;
  onOpenRelationPreview: (column: MappedRawColumn, value: unknown) => void;
}

/**
 * Build ColDefs for a raw-query result. Always returns a fully-formed array so
 * the table consumer never needs to fall back to a generic builder.
 *
 * Two cross-cutting concerns are baked in:
 *  - Relation columns get the shared relation-cell renderer + relation click
 *    handler so users can open `PreviewRelationTable`.
 *  - Per-cell editability is decided at render time via
 *    `isCellEditable(column, row)` — see `isCellEditable.ts` for the rules.
 */
export const buildRawQueryColumnDefs = ({
  columns,
  rows,
  reservedTables,
  isEditingEnabled,
  dirtyTracker,
  onOpenRelationPreview,
}: BuildRawQueryColumnDefsOptions): ColDef[] => {
  if (!columns.length) return [];

  const tableGroups = groupColumnsByTable(columns);
  const sampleRows = rows.slice(0, SAMPLE_ROW_COUNT);

  const defs: ColDef[] = [createHashIndexColumnDef()];

  for (const column of columns) {
    const hasRelation = isRelationColumn(column, reservedTables);
    const columnEditable =
      isEditingEnabled && isColumnPotentiallyEditable({ column, tableGroups });

    const estimatedWidth = estimateGridColumnWidth({
      headerName: column.aliasFieldName,
      rows: sampleRows,
      field: column.aliasFieldName,
      isKey: hasRelation || column.isPrimaryKey,
    });

    const fieldType = column.short_type_name || column.type || '';

    const canEditCell = (row: Record<string, unknown> | undefined) =>
      columnEditable && isCellEditable({ column, row, tableGroups });

    // JSON cells must stay "editable" for ag-grid so the JSON popup can open,
    // even when the result is read-only (function/expression columns, no PK).
    // Writes are still blocked in `valueSetter` via `canEditCell`.
    const isJsonCell = (row: Record<string, unknown> | undefined) => {
      const value = row?.[column.aliasFieldName];
      return (
        isJsonColumnType(fieldType) ||
        (typeof value === 'object' && value !== null)
      );
    };

    const editable: ColDef['editable'] = (params: EditableCallbackParams) => {
      const row = params.data as Record<string, unknown> | undefined;
      return canEditCell(row) || isJsonCell(row);
    };

    /**
     * Highlight dirty cells orange. Reads `dirtyTracker.cells` at paint-time so
     * it reflects saves/discards without rebuilding column defs.
     */
    const cellStyle = (params: CellClassParams) => {
      const field = params.colDef.field ?? '';
      if (!field) return undefined;

      const rowId = Number(params.node.id ?? params.node.rowIndex);
      const isDirty =
        columnEditable &&
        dirtyTracker.cells.some(c => c.rowId === rowId && c.fieldId === field);

      const style: { backgroundColor?: string; color?: string | number } = {
        backgroundColor: 'unset',
      };

      if (isDirty) {
        style.backgroundColor = 'var(--color-orange-200)';
        return style;
      }

      if (params.value === null) {
        style.color = 'var(--muted-foreground)';
      }

      return style;
    };

    defs.push({
      headerName: column.aliasFieldName,
      field: column.aliasFieldName,
      colId: column.aliasFieldName,
      filter: true,
      resizable: true,
      sortable: true,
      type: 'editableColumn',
      editable,
      cellStyle,
      cellEditorSelector: (params: ICellEditorParams) => {
        if (isJsonCell(params.data)) {
          return {
            component: 'AgJsonCellEditor',
            popup: true,
            popupPosition: 'under',
          };
        }
      },
      valueSetter: (params: ValueSetterParams) => {
        if (!canEditCell(params.data)) return false;

        return setCellValue({
          params,
          fieldId: column.aliasFieldName,
          isObjectColumn: isStructuredColumnType(fieldType),
          emptyAsNull: true,
        });
      },
      headerComponentParams: {
        innerHeaderComponent: DataGridKeyHeader,
        isPrimaryKey: column.isPrimaryKey,
        isForeignKey: column.isForeignKey,
      },
      cellRenderer: hasRelation ? DataGridRelationCell : undefined,
      cellRendererParams: hasRelation
        ? {
            isPrimaryKey: true,
            onOpenPreviewReverseTableModal: (id: string) =>
              onOpenRelationPreview(column, id),
          }
        : undefined,
      valueFormatter: (params: ValueFormatterParams) =>
        formatRawQueryCellValue(params, fieldType),
      width: estimatedWidth,
    } satisfies ColDef);
  }

  return defs;
};
