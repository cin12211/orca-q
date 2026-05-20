import type { SqlDialect } from '../sql-dialect.interface';
import { baseDialect, baseToLiteral } from './base.dialect';

const PG_TYPE_MAP: Record<string, string> = {
  // String types
  char: 'string',
  varchar: 'string',
  text: 'string',
  uuid: 'string',
  citext: 'string',
  money: 'string',
  inet: 'string',
  cidr: 'string',
  macaddr: 'string',
  macaddr8: 'string',
  tsvector: 'string',
  tsquery: 'string',
  xml: 'string',
  bytea: 'string',
  // Number types
  int2: 'number',
  int4: 'number',
  int8: 'number',
  numeric: 'number',
  float4: 'number',
  float8: 'number',
  decimal: 'number',
  oid: 'number',
  // Boolean
  bool: 'boolean',
  boolean: 'boolean',
  // JSON
  json: 'any',
  jsonb: 'any',
  // Date/Time
  date: 'string',
  timestamp: 'string',
  timestamptz: 'string',
  time: 'string',
  timetz: 'string',
  interval: 'string',
  // Bit strings
  bit: 'string',
  varbit: 'string',
};

export const postgresDialect: SqlDialect = {
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
      if (!value.length) {
        return "'{}'";
      }
      return `ARRAY[${value.map(item => this.toLiteral(item)).join(', ')}]`;
    }
    return baseToLiteral(value);
  },

  makePlaceholder(index: number): string {
    return `$${index}`;
  },

  castForLike(column: string): string {
    return `${column}::TEXT`;
  },

  likeOperator(caseInsensitive: boolean): string {
    return caseInsensitive ? 'ILIKE' : 'LIKE';
  },

  supportsReturning(): boolean {
    return true;
  },

  mapDbTypeToTsType(typeName: string): string {
    const normalized = typeName.toLowerCase();

    // Array types (e.g., _text, _int4)
    if (normalized.startsWith('_')) {
      return `${this.mapDbTypeToTsType(normalized.substring(1))}[]`;
    }

    return PG_TYPE_MAP[normalized] ?? 'unknown';
  },
};
