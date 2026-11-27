import {
  binaryValueToHex,
  isSerializedBinaryValue,
} from '~/core/helpers/binary-value';
import type { SqlDialect } from '../sql-dialect.interface';

/** Builds a dialect's binary literal from lower-case hex digits. */
export type BinaryLiteralBuilder = (hex: string) => string;

/** SQL-standard hex literal, understood by MySQL, MariaDB and SQLite. */
export const hexBinaryLiteral: BinaryLiteralBuilder = hex => `X'${hex}'`;

/**
 * Helper shared by all dialects: converts a JS value to a SQL literal.
 * Dialect-specific overrides (e.g. Postgres ARRAY syntax) should call
 * this for non-overridden branches.
 */
export function baseToLiteral(
  value: unknown,
  toBinaryLiteral: BinaryLiteralBuilder = hexBinaryLiteral
): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  // Binary values arrive as the JSON shape of a Node.js Buffer. Without this
  // branch they would fall through to the JSON-string case and write the
  // text `{"type":"Buffer",...}` into a BLOB/BYTEA column.
  if (isSerializedBinaryValue(value)) {
    return toBinaryLiteral(binaryValueToHex(value));
  }

  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }

  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }

  if (value instanceof Date) {
    return `'${value.toISOString().replace('T', ' ')}'`;
  }

  if (typeof value === 'string') {
    return `'${value.replace(/'/g, "''")}'`;
  }

  // Objects / anything else → JSON string
  return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
}

/**
 * Base dialect with sensible defaults.
 * Concrete dialects can spread this and override only what differs.
 */
export const baseDialect: SqlDialect = {
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

  castForLike(column: string): string {
    return column;
  },

  likeOperator(_caseInsensitive: boolean): string {
    return 'LIKE';
  },

  buildPagination(limit: number, offset: number): string {
    return `LIMIT ${limit} OFFSET ${offset}`;
  },

  requiresOrderByForPagination(): boolean {
    return false;
  },

  supportsNullsOrdering(): boolean {
    return false;
  },

  supportsReturning(): boolean {
    return false;
  },

  mapDbTypeToTsType(_typeName: string): string {
    return 'unknown';
  },
};
