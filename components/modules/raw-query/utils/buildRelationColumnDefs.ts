import type { ColDef } from 'ag-grid-community';
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
import { isRelationColumn } from './relationDetection';

const SAMPLE_ROW_COUNT = 10;

interface BuildRelationColumnDefsOptions {
  columns: MappedRawColumn[];
  rows: RowData[];
  reservedTables: ReservedTableSchemas[];
  onOpenRelationPreview: (column: MappedRawColumn, value: unknown) => void;
}

/**
 * Build ColDefs for a raw-query result when at least one column can be used as
 * a relation entry-point. Returns `undefined` when no relation columns are
 * detected so the default `DynamicTable` column-build flow can be used.
 */
export const buildRelationColumnDefs = ({
  columns,
  rows,
  reservedTables,
  onOpenRelationPreview,
}: BuildRelationColumnDefsOptions): ColDef[] | undefined => {
  const hasAnyRelation = columns.some(column =>
    isRelationColumn(column, reservedTables)
  );

  if (!hasAnyRelation) {
    return undefined;
  }

  const sampleRows = rows.slice(0, SAMPLE_ROW_COUNT);

  return [
    createHashIndexColumnDef(),
    ...columns.map(column => {
      const hasRelation = isRelationColumn(column, reservedTables);
      const estimatedWidth = estimateGridColumnWidth({
        headerName: column.aliasFieldName,
        rows: sampleRows,
        field: column.originalName,
        isKey: hasRelation,
      });

      return {
        headerName: column.aliasFieldName,
        field: column.originalName,
        colId: column.originalName,
        filter: true,
        resizable: true,
        editable: true,
        sortable: true,
        type: 'editableColumn',
        headerComponentParams: {
          innerHeaderComponent: DataGridKeyHeader,
          isPrimaryKey: column.isPrimaryKey,
          isForeignKey: column.isForeignKey,
        },
        cellRenderer: hasRelation ? DataGridRelationCell : undefined,
        cellRendererParams: {
          isPrimaryKey: hasRelation,
          onOpenPreviewReverseTableModal: (id: string) =>
            onOpenRelationPreview(column, id),
        },
        valueFormatter: formatGridCellValue,
        width: estimatedWidth,
      } satisfies ColDef;
    }),
  ];
};
