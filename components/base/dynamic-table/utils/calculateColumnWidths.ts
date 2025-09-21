import type { Column } from 'ag-grid-community';
import { cellValueFormatter, type RowData } from '.';
import {
  DEFAULT_COLUMN_MAX_WIDTH,
  DEFAULT_COLUMN_MIN_WIDTH,
  DEFAULT_COLUMN_CHAR_WIDTH,
  DEFAULT_COLUMN_GAP_WIDTH,
} from '../constants';

export function calculateColumnWidths({
  data,
  columns,
  maxWidth = DEFAULT_COLUMN_MAX_WIDTH,
  minWidth = DEFAULT_COLUMN_MIN_WIDTH,
  charWidth = DEFAULT_COLUMN_CHAR_WIDTH,
  gapWidth = DEFAULT_COLUMN_GAP_WIDTH,
}: {
  data: RowData[];
  columns: Column[];
  maxWidth?: number;
  minWidth?: number;
  charWidth?: number;
  gapWidth?: number;
}): Record<string, number> {
  const widths: Record<string, number> = {};
  columns.forEach((col: Column) => {
    const charHeaderWidth = charWidth * 1.2;
    const header = col.getColDef().headerName || '';
    const estimatedHeaderWidth = Math.round(
      header.length * charHeaderWidth + gapWidth
    );

    const field = col.getColDef().field!;
    // Get first 10 records (or all if fewer)
    const values = [
      ...data.slice(0, 10).map(row => {
        const content = row[field];

        return cellValueFormatter(content);
      }),
    ];
    // Calculate average length
    const avgLength =
      values.reduce((sum, val) => sum + val.length, 0) / values.length || 0;
    // Convert to pixels, add padding
    const estimatedWidth = Math.round(avgLength * charWidth + gapWidth);
    // Clamp between minWidth and maxWidth
    widths[field] = Math.min(maxWidth, Math.max(minWidth, estimatedWidth));

    if (widths[field] < estimatedHeaderWidth) {
      widths[field] = estimatedHeaderWidth;
    }
  });
  return widths;
}
