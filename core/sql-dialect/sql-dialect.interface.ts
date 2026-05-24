/**
 * SqlDialect – Strategy interface for database-specific SQL formatting.
 *
 * Each database type implements this interface so consuming code can
 * generate SQL fragments without if/else branching on `DatabaseClientType`.
 *
 * Frontend-only – does NOT handle connections or query execution (that's
 * the server's `IDatabaseAdapter` concern).
 */
export interface SqlDialect {
  /** Wrap an identifier (table/column name) in the dialect's quoting style. */
  quoteIdentifier(name: string): string;

  /**
   * Build a fully-qualified `schema.table` reference.
   * If `schemaName` is falsy, returns only the quoted table name.
   */
  qualifyTableName(tableName: string, schemaName?: string): string;

  /** Convert a JS value to a SQL literal string. */
  toLiteral(value: unknown): string;

  /** Return a positional placeholder for the given 1-based index. */
  makePlaceholder(index: number): string;

  /**
   * Wrap a column expression for use in a LIKE comparison.
   * E.g. Postgres adds `::TEXT` cast; others return the column as-is.
   */
  castForLike(column: string): string;

  /**
   * Return the correct LIKE keyword for this dialect.
   * @param caseInsensitive — when `true`, use ILIKE (Postgres) or LIKE (others).
   */
  likeOperator(caseInsensitive: boolean): string;

  /** Whether the dialect supports `RETURNING *` on INSERT/UPDATE/DELETE. */
  supportsReturning(): boolean;

  /**
   * Map a database-native type name (e.g. `int4`, `varchar`, `jsonb`)
   * to a TypeScript-friendly type string (`'string'`, `'number'`, etc.).
   */
  mapDbTypeToTsType(typeName: string): string;
}
