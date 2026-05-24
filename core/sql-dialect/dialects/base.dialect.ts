import type { SqlDialect } from '../sql-dialect.interface';

/**
 * Helper shared by all dialects: converts a JS value to a SQL literal.
 * Dialect-specific overrides (e.g. Postgres ARRAY syntax) should call
 * this for non-overridden branches.
 */
export function baseToLiteral(value: unknown): string {
  if (value === null || value === undefined) {
    return 'NULL';
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

  supportsReturning(): boolean {
    return false;
  },

  mapDbTypeToTsType(_typeName: string): string {
    return 'unknown';
  },
};
