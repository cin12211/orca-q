import type { SqlDialect } from '../sql-dialect.interface';
import { baseDialect, baseToLiteral } from './base.dialect';

const MYSQL_TYPE_MAP: Record<string, string> = {
  // String types
  char: 'string',
  varchar: 'string',
  text: 'string',
  tinytext: 'string',
  mediumtext: 'string',
  longtext: 'string',
  enum: 'string',
  set: 'string',
  binary: 'string',
  varbinary: 'string',
  blob: 'string',
  tinyblob: 'string',
  mediumblob: 'string',
  longblob: 'string',
  // Number types
  tinyint: 'number',
  smallint: 'number',
  mediumint: 'number',
  int: 'number',
  integer: 'number',
  bigint: 'number',
  float: 'number',
  double: 'number',
  decimal: 'number',
  numeric: 'number',
  // Boolean
  bit: 'boolean',
  bool: 'boolean',
  boolean: 'boolean',
  // JSON
  json: 'any',
  // Date/Time
  date: 'string',
  datetime: 'string',
  timestamp: 'string',
  time: 'string',
  year: 'number',
};

export const mysqlDialect: SqlDialect = {
  ...baseDialect,

  quoteIdentifier(name: string): string {
    return `\`${name.replace(/`/g, '``')}\``;
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
    return MYSQL_TYPE_MAP[normalized] ?? 'unknown';
  },
};
