import type {
  CellClassParams,
  ColDef,
  EditableCallbackParams,
} from 'ag-grid-community';
import DataGridRelationCell from '~/components/base/data-grid/components/cell-renderers/DataGridRelationCell.vue';
import DataGridKeyHeader from '~/components/base/data-grid/headers/DataGridKeyHeader.vue';
import {
  createHashIndexColumnDef,
  estimateGridColumnWidth,
  formatGridCellValue,
  type RowData,
} from '~/components/base/data-grid/utils';
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
      field: column.originalName,
      isKey: hasRelation || column.isPrimaryKey,
    });

    const editable: ColDef['editable'] = columnEditable
      ? (params: EditableCallbackParams) =>
          isCellEditable({
            column,
            row: params.data as Record<string, unknown> | undefined,
            tableGroups,
          })
      : false;

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
      field: column.originalName,
      colId: column.originalName,
      filter: true,
      resizable: true,
      sortable: true,
      type: 'editableColumn',
      editable,
      cellStyle,
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
      valueFormatter: formatGridCellValue,
      width: estimatedWidth,
    } satisfies ColDef);
  }

  return defs;
};
