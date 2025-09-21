import type { Column, ValueFormatterParams } from 'ag-grid-community';

export interface RowData {
  [key: string]: unknown;
}

export function calculateColumnWidths({
  data,
  columns,
  maxWidth = 300,
  minWidth = 40,
  charWidth = 8,
  gapWidth = 20,
}: {
  data: RowData[];
  columns: Column[];
  maxWidth: number;
  minWidth: number;
  charWidth: number;
  gapWidth: number;
}): Record<string, number> {
  const widths: Record<string, number> = {};
  columns.forEach((col: Column) => {
    const header = col.getColDef().headerName || '';
    const estimatedHeaderWidth = Math.round(
      header.length * charWidth + gapWidth
    );

    const field = col.getColDef().field!;
    // Get first 10 records (or all if fewer), include header
    const values = [
      field, // Header name
      ...data.slice(0, 10).map(row => String(row[field] || '')),
    ];
    // Calculate average length
    const avgLength =
      values.reduce((sum, val) => sum + val.length, 0) / values.length;
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

export const valueFormatter = (params: ValueFormatterParams, type?: string) => {
  const value = params.value;

  if (value === null) {
    return 'NULL';
  }

  if (type === 'jsonb' || type === 'json') {
    return value ? JSON.stringify(params.value, null, 2) : '';
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    Object.prototype.toString.call(value) === '[object Object]'
  ) {
    return value ? JSON.stringify(value, null, 2) : '';
  }

  return value;
};
