import { saveAs } from 'file-saver';
import Papa from 'papaparse';
import { HASH_INDEX_ID } from '~/components/base/dynamic-table/constants';

/**
 * NEW TYPE DEFINITION: Define the accepted formats for better type safety.
 *
 * 'csv-with-header' is the standard CSV export (headers included).
 * 'csv-no-header' is useful for appending data to an existing file or a simple value list.
 */
export type ExportFormat = 'csv-with-header' | 'csv-no-header' | 'json' | 'sql';
export type ColumnCopyFormat = 'list' | 'json';

const TAB_DELIMITER = '\t';
const NEWLINE_DELIMITER = '\n';

/** Utility to copy text to the clipboard and handle errors/feedback. */
export const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    // Add toast or console log here for success feedback
    console.log('Copied successfully!');
  } catch (err) {
    console.error('Copy failed:', err);
  }
};

/**
 * Removes internal AG-Grid properties (like HASH_INDEX_ID) from rows.
 * Always creates a shallow copy to avoid mutating the original row objects.
 * When `withStringifyNested` is true, nested objects/arrays are JSON-serialised
 * to plain strings — intended for CSV/TSV output only, NOT for SQL export
 * (SQL must preserve original types so `formatSqlValue` can produce correct literals).
 */
export const cleanRows = (
  rows: Record<string, unknown>[],
  withStringifyNested = false
) => {
  return rows.map(row => {
    // Spread to avoid mutating the original row
    const formattedRow: Record<string, unknown> = { ...row };

    if (withStringifyNested) {
      Object.keys(formattedRow).forEach(key => {
        const value = formattedRow[key];

        const isObjectType =
          value !== null &&
          typeof value === 'object' &&
          !(value instanceof Date);

        if (isObjectType) {
          formattedRow[key] = JSON.stringify(value);
        }
      });
    }

    delete formattedRow[HASH_INDEX_ID];

    return formattedRow;
  });
};

/**
 * Converts a raw JS value into a correctly escaped SQL literal string.
 * Preserves original types — callers must NOT pre-stringify values before
 * passing them here (i.e. do NOT run rows through `cleanRows(withStringifyNested=true)`).
 *
 * Type mapping:
 *  null / undefined → NULL
 *  boolean         → TRUE / FALSE  (ANSI SQL; compatible with Postgres, MySQL, SQLite)
 *  number / bigint → numeric literal (unquoted)
 *  string          → single-quoted with internal single-quotes escaped
 *  Date            → ISO datetime string, single-quoted
 *  object / array  → JSON string, single-quoted
 */
const formatSqlValue = (v: unknown): string => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'number' || typeof v === 'bigint') return String(v);
  if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
  if (v instanceof Date)
    return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
  // Nested objects / arrays → serialise as JSON string literal
  return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
};

/**
 * Generates the SQL INSERT statement for a batch of rows.
 * Expects RAW rows with original value types so that `formatSqlValue` can
 * produce the correct SQL literals (booleans → TRUE/FALSE, numbers → unquoted, etc.).
 *
 * @param schemaName - Optional schema name. When provided the target is
 *   `"schema"."table"` (ANSI-compatible), otherwise just `"table"`.
 */
const generateSqlInsert = (
  rows: Record<string, unknown>[],
  tableName: string,
  commentPrefix: string,
  schemaName?: string
) => {
  if (rows.length === 0) return '';
  const keys = Object.keys(rows[0]);

  const qualifiedTable = schemaName
    ? `"${schemaName}"."${tableName}"`
    : `"${tableName}"`;

  const valueRows = rows.map(
    row => `(${keys.map(k => formatSqlValue(row[k])).join(', ')})`
  );

  const sql =
    `-- ${commentPrefix} ${rows.length} rows on ${new Date().toLocaleString()}\n` +
    `-- Table: ${schemaName ? `${schemaName}.` : ''}${tableName}\n\n` +
    `INSERT INTO ${qualifiedTable} (${keys.map(k => `"${k}"`).join(', ')})\n` +
    `VALUES\n  ${valueRows.join(',\n  ')};\n`;
  return sql;
};

/**
 * Copies multiple rows to the clipboard based on the format.
 * CHÚ Ý: Format CSV sẽ được copy dưới dạng TSV (Tab Separated Values)
 * để đảm bảo việc dán vào Excel/Sheets tạo ra các cột riêng biệt.
 */
export const copyRowsData = (
  rows: Record<string, unknown>[],
  tableName: string,
  format: ExportFormat,
  schemaName?: string
) => {
  if (!rows.length) return;

  if (format === 'csv-with-header' || format === 'csv-no-header') {
    // Stringify nested objects for CSV/TSV so cells contain readable text
    const cleaned = cleanRows(rows, true);
    const includeHeader = format === 'csv-with-header';
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
    // Pass raw rows so formatSqlValue can preserve correct SQL types.
    // Only strip the internal HASH_INDEX_ID key, no other transformation.
    const rawCleaned = cleanRows(rows);
    const sql = generateSqlInsert(rawCleaned, tableName, 'Copied', schemaName);
    copyToClipboard(sql);
    return;
  }
};

/**
 * Exports data to a file.
 * (Hàm này vẫn tạo file CSV/JSON/SQL tiêu chuẩn như trước)
 */
export const exportData = (
  rows: Record<string, unknown>[],
  tableName: string,
  format: ExportFormat,
  type: 'selected' | 'all',
  schemaName?: string
) => {
  if (!rows.length) return;

  // For SQL export we need raw types; for CSV we stringify nested objects.
  const isCsvFormat =
    format === 'csv-with-header' || format === 'csv-no-header';
  const clean = cleanRows(rows, isCsvFormat);
  const count = clean.length;
  const prefix =
    type === 'selected' ? `selected_${count}_rows` : `all_${count}_rows`;
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const filename = `${tableName}_${prefix}_${timestamp}`;

  let blob: Blob;
  let ext: string;

  if (format === 'csv-with-header' || format === 'csv-no-header') {
    // VẪN SỬ DỤNG DELIMITER MẶC ĐỊNH (DẤU PHẨY) CHO FILE CSV TIÊU CHUẨN
    const includeHeader = format === 'csv-with-header';
    // Không cần chỉ định delimiter ở đây, PapaParse mặc định dùng dấu phẩy (,)
    const csv = Papa.unparse(clean, { header: includeHeader });
    // Prepend BOM (\uFEFF) cho Excel
    blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    ext = 'csv';
  } else if (format === 'json') {
    // ... (logic JSON) ...
    const json = JSON.stringify(clean);
    blob = new Blob([json], { type: 'application/json' });
    ext = 'json';
  } else if (format === 'sql') {
    // Use rawCleaned (no nested stringification) to preserve SQL types
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
 * 💡 HÀM MỚI: Copies data for a single column to the clipboard.
 * @param rows - The data rows (selected or all).
 * @param colId - The ID of the column to copy.
 * @param format - 'list' (newline separated) or 'json' (array of values).
 */
export const copyColumnData = (
  rows: Record<string, unknown>[],
  colId: string,
  format: ColumnCopyFormat
) => {
  if (!colId || !rows.length) return;

  const rawValues = rows.map(r => r[colId]);

  // Normalise values for display: null/undefined → '', objects → JSON string
  const displayValues = rawValues.map(v => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'object' && !(v instanceof Date)) return JSON.stringify(v);
    return v;
  });

  const result =
    format === 'json'
      ? // Use displayValues so callers get consistent, serialised output
        JSON.stringify(displayValues, null, 2)
      : displayValues.join(NEWLINE_DELIMITER);

  copyToClipboard(result);
};
