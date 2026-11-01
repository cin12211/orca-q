import type { SqlDialect } from '../sql-dialect.interface';
import { baseDialect } from './base.dialect';

const DUCKDB_TYPE_MAP: Record<string, string> = {
  varchar: 'string',
  uuid: 'string',
  blob: 'string',
  date: 'string',
  time: 'string',
  timestamp: 'string',
  'timestamp with time zone': 'string',
  interval: 'string',
  tinyint: 'number',
  smallint: 'number',
  integer: 'number',
  utinyint: 'number',
  usmallint: 'number',
  uinteger: 'number',
  float: 'number',
  double: 'number',
  // Serialized as strings so values above 2^53 keep their precision.
  bigint: 'string',
  ubigint: 'string',
  hugeint: 'string',
  uhugeint: 'string',
  decimal: 'string',
  boolean: 'boolean',
  json: 'any',
};

export const duckdbDialect: SqlDialect = {
  ...baseDialect,

  castForLike(column: string): string {
    return `CAST(${column} AS VARCHAR)`;
  },

  likeOperator(caseInsensitive: boolean): string {
    return caseInsensitive ? 'ILIKE' : 'LIKE';
  },

  supportsReturning(): boolean {
    return true;
  },

  mapDbTypeToTsType(typeName: string): string {
    const normalized = typeName.toLowerCase().replace(/\(.*\)$/, '');
    return DUCKDB_TYPE_MAP[normalized] ?? 'unknown';
  },
};
