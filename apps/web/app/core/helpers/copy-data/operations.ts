import { saveAs } from 'file-saver';
import Papa from 'papaparse';
import { cleanRows, generateSqlInsert } from './formatters';
import { type ExportFormat, type ColumnCopyFormat } from './types';

const TAB_DELIMITER = '\t';
const NEWLINE_DELIMITER = '\n';

/** Utility to copy text to the clipboard and handle errors/feedback. */
export const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    console.log('Copied successfully!');
  } catch (err) {
    console.error('Copy failed:', err);
  }
};

/**
 * Copies multiple rows to the clipboard based on the format.
 */
export const copyRowsData = (
  rows: Record<string, unknown>[],
  tableName: string,
  format: ExportFormat | `${ExportFormat}`,
  schemaName?: string
) => {
  if (!rows.length) return;

  if (
    format === 'csv-with-header' ||
    format === 'csv-no-header' ||
    format === 'tsv'
  ) {
    const cleaned = cleanRows(rows, true);
    const includeHeader = format !== 'csv-no-header';
    const tsv = Papa.unparse(cleaned, {
      header: includeHeader,
      delimiter: TAB_DELIMITER,
    });
    copyToClipboard(tsv);
    return;
  }

  if (format === 'json') {
    const cleaned = cleanRows(rows);
    copyToClipboard(JSON.stringify(cleaned));
    return;
  }

  if (format === 'sql') {
    const rawCleaned = cleanRows(rows);
    const sql = generateSqlInsert(rawCleaned, tableName, 'Copied', schemaName);
    copyToClipboard(sql);
    return;
  }
};

/**
 * Exports data to a file.
 */
export const exportData = (
  rows: Record<string, unknown>[],
  tableName: string,
  format: ExportFormat | `${ExportFormat}`,
  type: 'selected' | 'all',
  schemaName?: string,
  customFilename?: string
) => {
  if (!rows.length) return;

  const isCsvOrTsvFormat =
    format === 'csv-with-header' ||
    format === 'csv-no-header' ||
    format === 'tsv';
  const clean = cleanRows(rows, isCsvOrTsvFormat);
  const count = clean.length;
  const prefix =
    type === 'selected' ? `selected_${count}_rows` : `all_${count}_rows`;
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const filename = customFilename || `${tableName}_${prefix}_${timestamp}`;

  let blob: Blob;
  let ext: string;

  if (format === 'csv-with-header' || format === 'csv-no-header') {
    const includeHeader = format === 'csv-with-header';
    const csv = Papa.unparse(clean, { header: includeHeader });
    blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    ext = 'csv';
  } else if (format === 'tsv') {
    const tsv = Papa.unparse(clean, { header: true, delimiter: '\t' });
    blob = new Blob([tsv], { type: 'text/plain;charset=utf-8;' });
    ext = 'txt';
  } else if (format === 'json') {
    const json = JSON.stringify(clean, null, 2);
    blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    ext = 'json';
  } else if (format === 'sql') {
    const rawCleaned = cleanRows(rows);
    const sql = generateSqlInsert(
      rawCleaned,
      tableName,
      'Exported',
      schemaName
    );
    blob = new Blob([sql], { type: 'text/sql' });
    ext = 'sql';
  } else {
    return;
  }

  saveAs(blob, `${filename}.${ext}`);
};

/**
 * Copies data for a single column to the clipboard.
 */
export const copyColumnData = (
  rows: Record<string, unknown>[],
  colId: string,
  format: ColumnCopyFormat
) => {
  if (!colId || !rows.length) return;

  const rawValues = rows.map(r => r[colId]);

  const displayValues = rawValues.map(v => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'object' && !(v instanceof Date)) return JSON.stringify(v);
    return v;
  });

  const result =
    format === 'json'
      ? JSON.stringify(displayValues, null, 2)
      : displayValues.join(NEWLINE_DELIMITER);

  copyToClipboard(result);
};
