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

/** Removes internal AG-Grid properties (like HASH_INDEX_ID) from rows. */
export const cleanRows = (
  rows: Record<string, any>[],
  withStringifyNested = false
) => {
  return rows.map(row => {
    const formattedRow: Record<string, string> = row;

    if (withStringifyNested) {
      Object.keys(row).forEach(key => {
        const value = row[key];

        const isObjectType =
          (typeof value === 'object' ||
            Object.prototype.toString.call(value) === '[object Object]') &&
          value !== null;

        if (isObjectType) {
          formattedRow[key] = JSON.stringify(value);
        } else {
          formattedRow[key] = value;
        }
      });
    }

    delete formattedRow[HASH_INDEX_ID];

    return formattedRow;
  });
};

/**
 * Utility for converting a value into its correctly escaped and formatted SQL string.
 * This is reused for both SQL export and SQL list copy.
 */
const formatSqlValue = (v: any): string | number | 'NULL' => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`; // Escape single quotes
  if (typeof v === 'number' || typeof v === 'bigint')
    return v as unknown as number;
  if (typeof v === 'boolean') return !!v ? 1 : 0;
  if (v instanceof Date)
    return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
  // For all other objects (arrays, other objects), JSON stringify and escape
  return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
};

/**
 * Generates the SQL INSERT statement for a batch of rows.
 */
const generateSqlInsert = (
  rows: Record<string, any>[],
  tableName: string,
  commentPrefix: string
) => {
  if (rows.length === 0) return '';
  const keys = Object.keys(rows[0]);

  const values = rows.map(
    row => `(${keys.map(k => formatSqlValue(row[k])).join(', ')})`
  );

  const sql =
    `-- ${commentPrefix} ${rows.length} rows on ${new Date().toLocaleString()}\n` +
    `-- Table: ${tableName}\n\n` +
    `INSERT INTO "${tableName}" (${keys.map(k => `"${k}"`).join(', ')})\n` +
    `VALUES\n  ${values.join(',\n  ')};\n`;
  return sql;
};

/**
 * Copies multiple rows to the clipboard based on the format.
 * CHÚ Ý: Format CSV sẽ được copy dưới dạng TSV (Tab Separated Values)
 * để đảm bảo việc dán vào Excel/Sheets tạo ra các cột riêng biệt.
 */
export const copyRowsData = (
  rows: Record<string, any>[],
  tableName: string,
  format: ExportFormat // Chỉ định rõ ràng format nào cần copy
) => {
  if (!rows.length) return;

  const needNestedFormat =
    format === 'csv-with-header' || format === 'csv-no-header';

  const cleaned = cleanRows(rows, needNestedFormat);

  if (format === 'csv-with-header' || format === 'csv-no-header') {
    // 💡 SỬ DỤNG TSV CHO CLIPBOARD
    const includeHeader = format === 'csv-with-header';
    const tsv = Papa.unparse(cleaned, {
      header: includeHeader,
      delimiter: TAB_DELIMITER, // SỬ DỤNG KÝ TỰ TAB (\t)
    });
    copyToClipboard(tsv);
    return;
  }

  if (format === 'json') {
    // Thêm null, 2 để có định dạng dễ đọc hơn khi dán
    copyToClipboard(JSON.stringify(cleaned));
    return;
  }

  if (format === 'sql') {
    const sql = generateSqlInsert(cleaned, tableName, 'Copied');
    copyToClipboard(sql);
    return;
  }
};

/**
 * Exports data to a file.
 * (Hàm này vẫn tạo file CSV/JSON/SQL tiêu chuẩn như trước)
 */
export const exportData = (
  rows: Record<string, any>[],
  tableName: string,
  format: ExportFormat,
  type: 'selected' | 'all'
) => {
  if (!rows.length) return;

  const needNestedFormat =
    format === 'csv-with-header' || format === 'csv-no-header';

  const clean = cleanRows(rows, needNestedFormat);
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
    // ... (logic SQL) ...
    const sql = generateSqlInsert(clean, tableName, 'Exported');
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
  rows: Record<string, any>[],
  colId: string,
  format: ColumnCopyFormat
) => {
  if (!colId || !rows.length) return;

  const values = rows.map(r => r[colId]);

  let result: string;
  let valuesToCopy: any[] = [];

  values.forEach(v => {
    let value = v;
    if (v === null || v === undefined) {
      value = '';
    } else if (typeof v === 'object' && !(v instanceof Date) && v !== null) {
      value = JSON.stringify(v);
    }
    valuesToCopy.push(value);
  });

  if (format === 'json') {
    result = JSON.stringify(values, null, 2);
  } else {
    result = valuesToCopy.join(NEWLINE_DELIMITER);
  }

  copyToClipboard(result);
};
