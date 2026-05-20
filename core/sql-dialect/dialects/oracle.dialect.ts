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
    return baseToLiteral(value);
  },

  makePlaceholder(index: number): string {
    return `:${index}`;
  },

  mapDbTypeToTsType(typeName: string): string {
    const normalized = typeName.toLowerCase();
    return ORACLE_TYPE_MAP[normalized] ?? 'unknown';
  },
};
