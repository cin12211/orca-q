import type { SqlDialect } from '../sql-dialect.interface';
import { baseDialect, baseToLiteral } from './base.dialect';

const SQLITE_TYPE_MAP: Record<string, string> = {
  // Affinity: TEXT
  text: 'string',
  varchar: 'string',
  char: 'string',
  clob: 'string',
  // Affinity: INTEGER
  integer: 'number',
  int: 'number',
  tinyint: 'number',
  smallint: 'number',
  mediumint: 'number',
  bigint: 'number',
  // Affinity: REAL
  real: 'number',
  double: 'number',
  float: 'number',
  // Affinity: NUMERIC
  numeric: 'number',
  decimal: 'number',
  // Boolean (stored as integer)
  boolean: 'boolean',
  bool: 'boolean',
  // Date/Time (stored as text/real/integer)
  date: 'string',
  datetime: 'string',
  timestamp: 'string',
  // BLOB
  blob: 'string',
  // JSON (stored as text)
  json: 'any',
};

export const sqliteDialect: SqlDialect = {
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

  makePlaceholder(_index: number): string {
    return '?';
  },

  mapDbTypeToTsType(typeName: string): string {
    const normalized = typeName.toLowerCase();
    return SQLITE_TYPE_MAP[normalized] ?? 'unknown';
  },
};
