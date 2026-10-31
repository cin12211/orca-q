import type { SqlDialect } from '../sql-dialect.interface';
import { baseDialect, baseToLiteral } from './base.dialect';

const MSSQL_TYPE_MAP: Record<string, string> = {
  // String types
  char: 'string',
  varchar: 'string',
  nchar: 'string',
  nvarchar: 'string',
  text: 'string',
  ntext: 'string',
  xml: 'string',
  uniqueidentifier: 'string',
  binary: 'string',
  varbinary: 'string',
  image: 'string',
  // Number types
  tinyint: 'number',
  smallint: 'number',
  int: 'number',
  bigint: 'number',
  float: 'number',
  real: 'number',
  decimal: 'number',
  numeric: 'number',
  money: 'number',
  smallmoney: 'number',
  // Boolean
  bit: 'boolean',
  // Date/Time
  date: 'string',
  datetime: 'string',
  datetime2: 'string',
  smalldatetime: 'string',
  datetimeoffset: 'string',
  time: 'string',
  // JSON (stored as nvarchar)
  json: 'any',
};

export const mssqlDialect: SqlDialect = {
  ...baseDialect,

  quoteIdentifier(name: string): string {
    return `[${name.replace(/\]/g, ']]')}]`;
  },

  qualifyTableName(tableName: string, schemaName?: string): string {
    const quoted = this.quoteIdentifier(tableName);
    if (!schemaName) return quoted;
    return `${this.quoteIdentifier(schemaName)}.${quoted}`;
  },

  toLiteral(value: unknown): string {
    if (Array.isArray(value)) {
      return `N'${JSON.stringify(value).replace(/'/g, "''")}'`;
    }
    // T-SQL has no TRUE/FALSE literals; `bit` columns take 1/0.
    if (typeof value === 'boolean') {
      return value ? '1' : '0';
    }
    // ISO 8601 with `T` is the only format every date/time type accepts
    // regardless of the session's DATEFORMAT and language.
    if (value instanceof Date) {
      return `'${value.toISOString()}'`;
    }
    // N-prefix keeps non-ASCII text intact when compared against nvarchar.
    if (typeof value === 'string') {
      return `N'${value.replace(/'/g, "''")}'`;
    }
    return baseToLiteral(value);
  },

  makePlaceholder(index: number): string {
    return `@p${index}`;
  },

  castForLike(column: string): string {
    return `CAST(${column} AS NVARCHAR(MAX))`;
  },

  buildPagination(limit: number, offset: number): string {
    return `OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`;
  },

  requiresOrderByForPagination(): boolean {
    return true;
  },

  mapDbTypeToTsType(typeName: string): string {
    const normalized = typeName.toLowerCase();
    return MSSQL_TYPE_MAP[normalized] ?? 'unknown';
  },
};
