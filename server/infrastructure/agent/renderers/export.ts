import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type {
  AgentExportFilePreview,
  AgentExportFileResult,
  AgentExportFormat,
} from '~/components/modules/agent/types';

const PREVIEW_LIMIT = 20;

const MIME_TYPE_BY_FORMAT: Record<AgentExportFormat, string> = {
  csv: 'text/csv;charset=utf-8',
  json: 'application/json;charset=utf-8',
  sql: 'application/sql;charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

const EXTENSION_BY_FORMAT: Record<AgentExportFormat, string> = {
  csv: 'csv',
  json: 'json',
  sql: 'sql',
  xlsx: 'xlsx',
};

const SQL_TYPE_PRIORITY = [
  'boolean',
  'integer',
  'numeric',
  'timestamp',
  'jsonb',
];

type ExportRow = Record<string, unknown>;

function collectColumns(rows: ExportRow[]): string[] {
  const columns: string[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (seen.has(key)) continue;
      seen.add(key);
      columns.push(key);
    }
  }

  return columns;
}

function sanitizeFilename(filename: string) {
  return (
    filename
      .trim()
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-|-$/g, '') || 'export'
  );
}

function withExtension(filename: string, format: AgentExportFormat) {
  const safeName = sanitizeFilename(filename);
  const extension = EXTENSION_BY_FORMAT[format];
  return safeName.endsWith(`.${extension}`)
    ? safeName
    : `${safeName}.${extension}`;
}

function toPreview(
  rows: ExportRow[],
  columns: string[]
): AgentExportFilePreview {
  return {
    columns,
    rows: rows.slice(0, PREVIEW_LIMIT),
    truncated: rows.length > PREVIEW_LIMIT,
  };
}

function escapeSqlIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function escapeSqlValue(value: unknown): string {
  if (value === null || typeof value === 'undefined') {
    return 'NULL';
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : 'NULL';
  }

  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }

  if (value instanceof Date) {
    return `'${value.toISOString().replace(/'/g, "''")}'`;
  }

  if (typeof value === 'object') {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  }

  return `'${String(value).replace(/'/g, "''")}'`;
}

function inferSqlType(values: unknown[]): string {
  let bestType = 'text';

  for (const value of values) {
    if (value === null || typeof value === 'undefined') continue;

    const inferredType = (() => {
      if (typeof value === 'boolean') return 'boolean';
      if (typeof value === 'number') {
        return Number.isInteger(value) ? 'integer' : 'numeric';
      }
      if (value instanceof Date) return 'timestamp';
      if (typeof value === 'object') return 'jsonb';
      if (typeof value === 'string') {
        const parsedDate = Date.parse(value);
        if (!Number.isNaN(parsedDate) && /[-:TZ]/.test(value)) {
          return 'timestamp';
        }
      }
      return 'text';
    })();

    if (
      SQL_TYPE_PRIORITY.indexOf(inferredType) >
      SQL_TYPE_PRIORITY.indexOf(bestType)
    ) {
      bestType = inferredType;
    }
  }

  return bestType;
}

function toSqlContent(rows: ExportRow[], tableName: string, columns: string[]) {
  const safeTableName = escapeSqlIdentifier(tableName);

  const createStatement = columns.length
    ? `CREATE TABLE ${safeTableName} (\n${columns
        .map(column => {
          const values = rows.map(row => row[column]);
          return `  ${escapeSqlIdentifier(column)} ${inferSqlType(values)}`;
        })
        .join(',\n')}\n);`
    : `CREATE TABLE ${safeTableName} ();`;

  const insertStatements = rows.map(row => {
    const columnList = columns.map(escapeSqlIdentifier).join(', ');
    const values = columns
      .map(column => escapeSqlValue(row[column]))
      .join(', ');
    return `INSERT INTO ${safeTableName} (${columnList}) VALUES (${values});`;
  });

  return [createStatement, ...insertStatements].join('\n\n');
}

export function buildExportFileResult({
  data,
  filename,
  format,
  tableName,
}: {
  data: ExportRow[];
  filename?: string;
  format: AgentExportFormat;
  tableName?: string;
}): AgentExportFileResult {
  const rows = Array.isArray(data) ? data : [];
  const columns = collectColumns(rows);
  const resolvedBaseName = filename || tableName || 'export';
  const resolvedFilename = withExtension(resolvedBaseName, format);

  if (rows.length === 0) {
    return {
      filename: resolvedFilename,
      mimeType: MIME_TYPE_BY_FORMAT[format],
      content: '',
      format,
      encoding: 'utf8',
      fileSize: 0,
      preview: toPreview([], columns),
      error: 'No rows available to export.',
    };
  }

  const preview = toPreview(rows, columns);

  if (format === 'xlsx') {
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, tableName || 'Export');
    const content = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });

    return {
      filename: resolvedFilename,
      mimeType: MIME_TYPE_BY_FORMAT.xlsx,
      content,
      format,
      encoding: 'base64',
      fileSize: Buffer.from(content, 'base64').length,
      preview,
    };
  }

  const content =
    format === 'csv'
      ? Papa.unparse(rows)
      : format === 'json'
        ? JSON.stringify(rows, null, 2)
        : toSqlContent(rows, tableName || 'export_data', columns);

  return {
    filename: resolvedFilename,
    mimeType: MIME_TYPE_BY_FORMAT[format],
    content,
    format,
    encoding: 'utf8',
    fileSize: Buffer.byteLength(content, 'utf8'),
    preview,
  };
}
