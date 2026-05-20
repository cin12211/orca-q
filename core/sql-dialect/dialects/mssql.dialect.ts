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
      return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
    }
    return baseToLiteral(value);
  },

  makePlaceholder(index: number): string {
    return `@p${index}`;
  },

  mapDbTypeToTsType(typeName: string): string {
    const normalized = typeName.toLowerCase();
    return MSSQL_TYPE_MAP[normalized] ?? 'unknown';
  },
};
