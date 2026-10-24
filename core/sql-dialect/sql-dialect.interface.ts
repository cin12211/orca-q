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

  /**
   * Build the row-limiting tail of a SELECT (e.g. `LIMIT 100 OFFSET 0`).
   * Dialects that need an ORDER BY for paging (SQL Server) rely on the caller
   * passing one; see `requiresOrderByForPagination`.
   */
  buildPagination(limit: number, offset: number): string;

  /**
   * Whether `buildPagination` is only valid after an ORDER BY clause
   * (SQL Server `OFFSET … FETCH`). Callers fall back to `ORDER BY (SELECT NULL)`.
   */
  requiresOrderByForPagination(): boolean;

  /** Whether the dialect supports `NULLS FIRST` / `NULLS LAST` in ORDER BY. */
  supportsNullsOrdering(): boolean;

  /** Whether the dialect supports `RETURNING *` on INSERT/UPDATE/DELETE. */
  supportsReturning(): boolean;

  /**
   * Map a database-native type name (e.g. `int4`, `varchar`, `jsonb`)
   * to a TypeScript-friendly type string (`'string'`, `'number'`, etc.).
   */
  mapDbTypeToTsType(typeName: string): string;
}
