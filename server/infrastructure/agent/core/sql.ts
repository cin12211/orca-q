import type { QueryField } from './types';

export const DEFAULT_RENDER_LIMIT = 100;
export const MAX_RENDER_LIMIT = 500;
/** Max rows fetched by export_query_result — higher than render since user is downloading */
export const MAX_EXPORT_LIMIT = 100_000;

const SELECT_PATTERN = /^(select|with|values|table)\b/i;
const MUTATION_PATTERN =
  /^(insert|update|delete|drop|truncate|alter|create|grant|revoke|comment|refresh|vacuum)\b/i;

const POSTGRES_OID_TYPE_MAP: Record<number, string> = {
  16: 'bool',
  20: 'int8',
  21: 'int2',
  23: 'int4',
  25: 'text',
  114: 'json',
  700: 'float4',
  701: 'float8',
  1043: 'varchar',
  1082: 'date',
  1114: 'timestamp',
  1184: 'timestamptz',
  1700: 'numeric',
  2950: 'uuid',
  3802: 'jsonb',
};

export function stripSqlComments(sql: string) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '');
}

export function stripMarkdownCodeFence(sql: string) {
  const trimmed = sql.trim();
  const match = trimmed.match(/^```(?:sql)?\s*([\s\S]*?)```$/i);
  return match?.[1]?.trim() || trimmed;
}

export function normalizeSql(sql: string) {
  return stripSqlComments(stripMarkdownCodeFence(sql))
    .trim()
    .replace(/;+\s*$/, '');
}

export function isSelectLikeSql(sql: string) {
  return SELECT_PATTERN.test(normalizeSql(sql));
}

export function isMutationSql(sql: string) {
  return MUTATION_PATTERN.test(normalizeSql(sql));
}

export function clampLimit(limit?: number) {
  if (!limit || Number.isNaN(limit)) {
    return DEFAULT_RENDER_LIMIT;
  }

  return Math.max(1, Math.min(limit, MAX_RENDER_LIMIT));
}

export function quoteIdentifier(identifier: string) {
  if (!/^[A-Za-z_][A-Za-z0-9_$]*$/.test(identifier)) {
    throw new Error(`Invalid SQL identifier: ${identifier}`);
  }

  return `"${identifier.replace(/"/g, '""')}"`;
}

export function getQualifiedTableName(schemaName: string, tableName: string) {
  return `${quoteIdentifier(schemaName)}.${quoteIdentifier(tableName)}`;
}

export function resolveFieldType(field: QueryField) {
  const oid = Number(field.dataTypeID);
  return POSTGRES_OID_TYPE_MAP[oid] || String(field.dataTypeID || 'unknown');
}
