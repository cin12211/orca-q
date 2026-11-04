import type { SqlDialect } from '#shared/sql-dialect';
import { createError } from 'h3';
import Papa from 'papaparse';

interface ExportContentOptions {
  dialect: SqlDialect;
  schema: string;
  tableName: string;
  columns: string[];
  rows: unknown[][];
  format: string;
  /** Overrides `dialect.toLiteral` for engine-specific values. */
  toLiteral?: (value: unknown) => string;
}

/** Builds a whole-table CSV, JSON or INSERT export from array-mode rows. */
export function buildExportContent({
  dialect,
  schema,
  tableName,
  columns,
  rows,
  format,
  toLiteral = value => dialect.toLiteral(value),
}: ExportContentOptions): string {
  if (format === 'csv') {
    return Papa.unparse({ fields: columns, data: rows });
  }

  if (format === 'json') {
    const objects = rows.map(row =>
      Object.fromEntries(columns.map((name, index) => [name, row[index]]))
    );
    return JSON.stringify(objects, null, 2);
  }

  if (format === 'sql') {
    const table = dialect.qualifyTableName(tableName, schema);
    const columnList = columns
      .map(name => dialect.quoteIdentifier(name))
      .join(', ');
    const inserts = rows.map(
      row =>
        `INSERT INTO ${table} (${columnList}) VALUES (${row.map(toLiteral).join(', ')});`
    );

    return [
      `-- Export of ${schema}.${tableName}`,
      `-- Generated at ${new Date().toISOString()}`,
      '',
      ...inserts,
      '',
      `-- Total rows exported: ${rows.length}`,
      '',
    ].join('\n');
  }

  throw createError({ statusCode: 400, message: 'Invalid format' });
}
