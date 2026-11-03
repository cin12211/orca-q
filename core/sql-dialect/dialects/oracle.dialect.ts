import type { SqlDialect } from '../sql-dialect.interface';
import { baseDialect, baseToLiteral } from './base.dialect';

const ORACLE_TYPE_MAP: Record<string, string> = {
  // String types
  char: 'string',
  varchar2: 'string',
  nchar: 'string',
  nvarchar2: 'string',
  clob: 'string',
  nclob: 'string',
  long: 'string',
  raw: 'string',
  blob: 'string',
  // Number types
  number: 'number',
  float: 'number',
  binary_float: 'number',
  binary_double: 'number',
  integer: 'number',
  int: 'number',
  smallint: 'number',
  // Date/Time
  date: 'string',
  timestamp: 'string',
  interval: 'string',
  // JSON (Oracle 21c+)
  json: 'any',
  // Boolean (Oracle 23c+)
  boolean: 'boolean',
};

const ISO_UTC_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

export const oracleDialect: SqlDialect = {
  ...baseDialect,

  quoteIdentifier(name: string): string {
    return `"${name.replace(/"/g, '""')}"`;
  },

  qualifyTableName(tableName: string, schemaName?: string): string {
    const quoted = this.quoteIdentifier(tableName);
    if (!schemaName) return quoted;
    return `${this.quoteIdentifier(schemaName)}.${quoted}`;
  },

  toLiteral(value: unknown): string {
    if (Array.isArray(value)) {
      return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
    }
    // Oracle before 23ai has no boolean literals; flags are NUMBER(1).
    if (typeof value === 'boolean') {
      return value ? '1' : '0';
    }
    // Date columns reach us as ISO strings from the JSON API, which Oracle
    // does not convert implicitly.
    const isoText =
      value instanceof Date
        ? value.toISOString()
        : typeof value === 'string' && ISO_UTC_TIMESTAMP.test(value)
          ? value
          : null;

    if (isoText) {
      const fractional = isoText.includes('.') ? '.FF' : '';
      return `TO_TIMESTAMP_TZ('${isoText}', 'YYYY-MM-DD"T"HH24:MI:SS${fractional}"Z"')`;
    }
    return baseToLiteral(value);
  },

  makePlaceholder(index: number): string {
    return `:${index}`;
  },

  buildPagination(limit: number, offset: number): string {
    return `OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`;
  },

  supportsNullsOrdering(): boolean {
    return true;
  },

  mapDbTypeToTsType(typeName: string): string {
    const normalized = typeName.toLowerCase();
    return ORACLE_TYPE_MAP[normalized] ?? 'unknown';
  },
};
