import type { Column } from 'ag-grid-community';
import { cellValueFormatter, type RowData } from '.';
import {
  DEFAULT_COLUMN_MAX_WIDTH,
  DEFAULT_COLUMN_MIN_WIDTH,
  DEFAULT_COLUMN_GAP_WIDTH,
} from '../constants';

// Shared canvas context for measuring text widths
const canvas: HTMLCanvasElement = document.createElement('canvas');
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

/**
 * Measure text width in pixels (cached).
 * @param text - The text to measure
 * @param font - CSS font string (e.g. "500 12px system-ui")
 */
export function measureTextWidth(text: string, font: string): number {
  ctx.font = font;
  const width = Math.round(ctx.measureText(text).width);

  return width;
}

/**
 * Estimate the width of a column's cell values.
 */
function estimateCellContentWidth(field: string, rows: RowData[]): number {
  const formattedValues = rows.map(row => cellValueFormatter(row[field]));

  const longestValue = formattedValues.reduce((a, b) =>
    a.length >= b.length ? a : b
  );

  return measureTextWidth(longestValue, '500 12px system-ui');
}

/**
 * Estimate width for a single column.
 */
export function estimateColumnWidth({
  rows,
  headerName,
  field,
  maxWidth = DEFAULT_COLUMN_MAX_WIDTH,
  minWidth = DEFAULT_COLUMN_MIN_WIDTH,
  gapWidth = DEFAULT_COLUMN_GAP_WIDTH,
}: {
  rows: RowData[];
  headerName: string;
  field: string;
  maxWidth?: number;
  minWidth?: number;
  gapWidth?: number;
}): number {
  const headerWidth = measureTextWidth(headerName, '700 14px system-ui');
  const contentWidth = rows.length ? estimateCellContentWidth(field, rows) : 0;

  const finalWidth = Math.max(headerWidth, contentWidth) + gapWidth;
  return Math.min(maxWidth, Math.max(minWidth, finalWidth));
}

/**
 * Estimate widths for all columns.
 */
export function estimateAllColumnWidths({
  rows,
  columns,
  maxWidth = DEFAULT_COLUMN_MAX_WIDTH,
  minWidth = DEFAULT_COLUMN_MIN_WIDTH,
  gapWidth = DEFAULT_COLUMN_GAP_WIDTH,
}: {
  rows: RowData[];
  columns: Column[];
  maxWidth?: number;
  minWidth?: number;
  gapWidth?: number;
}): Record<string, number> {
  const widths: Record<string, number> = {};

  columns.forEach((col: Column) => {
    const { headerName = '', field } = col.getColDef();
    if (!field) return;

    widths[field] = estimateColumnWidth({
      rows,
      headerName,
      field,
      maxWidth,
      minWidth,
      gapWidth,
    });
  });

  return widths;
}
