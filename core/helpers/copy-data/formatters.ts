import { DATA_GRID_ROW_METADATA_IDS } from '~/core/constants/data-grid-row-metadata';

/**
 * Removes internal AG-Grid properties from rows.
 * Always creates a shallow copy to avoid mutating the original row objects.
 * When `withStringifyNested` is true, nested objects/arrays are JSON-serialised
 * to plain strings — intended for CSV/TSV output only, NOT for SQL export.
 */
export const cleanRows = (
  rows: Record<string, unknown>[],
  withStringifyNested = false
) => {
  return rows.map(row => {
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

    DATA_GRID_ROW_METADATA_IDS.forEach(key => {
      delete formattedRow[key];
    });

    return formattedRow;
  });
};

/**
 * Converts a raw JS value into a correctly escaped SQL literal string.
 */
export const formatSqlValue = (v: unknown): string => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'number' || typeof v === 'bigint') return String(v);
  if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
  if (v instanceof Date)
    return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
  return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
};

/**
 * Generates the SQL INSERT statement for a batch of rows.
 */
export const generateSqlInsert = (
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

  return (
    `-- ${commentPrefix} ${rows.length} rows on ${new Date().toLocaleString()}\n` +
    `-- Table: ${schemaName ? `${schemaName}.` : ''}${tableName}\n\n` +
    `INSERT INTO ${qualifiedTable} (${keys.map(k => `"${k}"`).join(', ')})\n` +
    `VALUES\n  ${valueRows.join(',\n  ')};\n`
  );
};
