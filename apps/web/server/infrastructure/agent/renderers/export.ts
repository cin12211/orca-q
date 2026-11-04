import Papa from 'papaparse';
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
  markdown: 'text/markdown;charset=utf-8',
  txt: 'text/plain;charset=utf-8',
  tsv: 'text/tab-separated-values;charset=utf-8',
  xml: 'application/xml;charset=utf-8',
  yaml: 'application/yaml;charset=utf-8',
  html: 'text/html;charset=utf-8',
};

const EXTENSION_BY_FORMAT: Record<AgentExportFormat, string> = {
  csv: 'csv',
  json: 'json',
  sql: 'sql',
  markdown: 'md',
  txt: 'txt',
  tsv: 'tsv',
  xml: 'xml',
  yaml: 'yaml',
  html: 'html',
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

function toMarkdownContent(rows: ExportRow[], columns: string[]): string {
  if (columns.length === 0) return '';

  const header = `| ${columns.join(' | ')} |`;
  const separator = `| ${columns.map(() => '---').join(' | ')} |`;
  const bodyRows = rows.map(row => {
    const cells = columns.map(col => {
      const value = row[col];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value).replace(/\|/g, '\\|');
    });
    return `| ${cells.join(' | ')} |`;
  });

  return [header, separator, ...bodyRows].join('\n');
}

function toTsvContent(rows: ExportRow[], columns: string[]): string {
  const header = columns.join('\t');
  const bodyRows = rows.map(row =>
    columns
      .map(col => {
        const value = row[col];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        // Escape tabs/newlines in cell values
        return String(value).replace(/\t/g, ' ').replace(/\n/g, ' ');
      })
      .join('\t')
  );
  return [header, ...bodyRows].join('\n');
}

function toTxtContent(rows: ExportRow[], columns: string[]): string {
  if (columns.length === 0 || rows.length === 0) return '';

  // Compute column widths
  const widths = columns.map(col => {
    const max = Math.max(
      col.length,
      ...rows.map(row => {
        const v = row[col];
        if (v === null || v === undefined) return 0;
        return String(typeof v === 'object' ? JSON.stringify(v) : v).length;
      })
    );
    return Math.min(max, 50); // cap at 50 chars for readability
  });

  const pad = (val: string, width: number) => val.padEnd(width).slice(0, width);
  const divider = widths.map(w => '-'.repeat(w)).join('  ');
  const header = columns.map((col, i) => pad(col, widths[i])).join('  ');

  const bodyRows = rows.map(row =>
    columns
      .map((col, i) => {
        const v = row[col];
        const str =
          v === null || v === undefined
            ? ''
            : typeof v === 'object'
              ? JSON.stringify(v)
              : String(v);
        return pad(str, widths[i]);
      })
      .join('  ')
  );

  return [header, divider, ...bodyRows].join('\n');
}

function escapeXmlValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toXmlContent(
  rows: ExportRow[],
  columns: string[],
  tableName: string
): string {
  const tagName = tableName.replace(/[^a-zA-Z0-9_]/g, '_') || 'row';
  const items = rows.map(row => {
    const fields = columns.map(col => {
      const safeCol = col.replace(/[^a-zA-Z0-9_]/g, '_') || '_col';
      return `    <${safeCol}>${escapeXmlValue(row[col])}</${safeCol}>`;
    });
    return `  <${tagName}>\n${fields.join('\n')}\n  </${tagName}>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<data>\n${items.join('\n')}\n</data>`;
}

function yamlScalar(value: unknown, indent: string): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      const items = value
        .map(item => `${indent}  - ${yamlScalar(item, `${indent}  `)}`)
        .join('\n');
      return `\n${items}`;
    }
    const obj = value as Record<string, unknown>;
    const entries = Object.entries(obj)
      .map(([k, v]) => `${indent}  ${k}: ${yamlScalar(v, `${indent}  `)}`)
      .join('\n');
    return `\n${entries}`;
  }
  const str = String(value);
  // Quote strings containing special YAML chars
  if (/[:#\[\]{}&*!|>'"%@`\n]/.test(str) || str.trim() !== str) {
    return `"${str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
  }
  return str;
}

function toYamlContent(rows: ExportRow[], columns: string[]): string {
  const items = rows.map(row => {
    const fields = columns.map((col, i) => {
      const prefix = i === 0 ? '- ' : '  ';
      return `${prefix}${col}: ${yamlScalar(row[col], '  ')}`;
    });
    return fields.join('\n');
  });
  return items.join('\n') + '\n';
}

function toHtmlContent(
  rows: ExportRow[],
  columns: string[],
  tableName: string
): string {
  const escapeHtml = (v: unknown) => {
    const str =
      v === null || v === undefined
        ? ''
        : typeof v === 'object'
          ? JSON.stringify(v)
          : String(v);
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  };

  const thead = `<thead>\n    <tr>\n${columns.map(c => `      <th>${escapeHtml(c)}</th>`).join('\n')}\n    </tr>\n  </thead>`;
  const tbody = `<tbody>\n${rows
    .map(
      row =>
        `    <tr>\n${columns.map(col => `      <td>${escapeHtml(row[col])}</td>`).join('\n')}\n    </tr>`
    )
    .join('\n')}\n  </tbody>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${tableName}</title>
  <style>
    body { font-family: sans-serif; padding: 1rem; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f4f4f4; font-weight: 600; }
    tr:nth-child(even) { background: #fafafa; }
  </style>
</head>
<body>
  <h2>${tableName}</h2>
  <table>
  ${thead}
  ${tbody}
  </table>
</body>
</html>`;
}

export function buildExportFileResult({
  data,
  content: rawContent,
  filename,
  format,
  tableName,
}: {
  data?: ExportRow[];
  content?: string;
  filename?: string;
  format: AgentExportFormat;
  tableName?: string;
}): AgentExportFileResult {
  const resolvedBaseName = filename || tableName || 'export';
  const resolvedFilename = withExtension(resolvedBaseName, format);

  // ── Free-form content mode ──────────────────────────────────────────────────
  // When `content` is provided directly, skip all table rendering logic and
  // write the content as-is. This handles: chat notes → .md, SQL queries →
  // .sql, custom text → .txt, hand-crafted YAML/HTML/XML → their formats.
  if (rawContent !== undefined) {
    const text = rawContent;
    const preview: AgentExportFilePreview = {
      columns: [],
      rows: [],
      truncated: false,
    };
    return {
      filename: resolvedFilename,
      mimeType: MIME_TYPE_BY_FORMAT[format],
      content: text,
      format,
      encoding: 'utf8',
      fileSize: Buffer.byteLength(text, 'utf8'),
      preview,
    };
  }

  // ── Tabular data mode ───────────────────────────────────────────────────────
  const rows = Array.isArray(data) ? data : [];
  const columns = collectColumns(rows);

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

  let content: string;
  switch (format) {
    case 'csv':
      content = Papa.unparse(rows);
      break;
    case 'json':
      content = JSON.stringify(rows, null, 2);
      break;
    case 'sql':
      content = toSqlContent(rows, tableName || 'export_data', columns);
      break;
    case 'markdown':
      content = toMarkdownContent(rows, columns);
      break;
    case 'txt':
      content = toTxtContent(rows, columns);
      break;
    case 'tsv':
      content = toTsvContent(rows, columns);
      break;
    case 'xml':
      content = toXmlContent(rows, columns, tableName || 'export_data');
      break;
    case 'yaml':
      content = toYamlContent(rows, columns);
      break;
    case 'html':
      content = toHtmlContent(rows, columns, tableName || 'export_data');
      break;
    default:
      content = Papa.unparse(rows);
  }

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
