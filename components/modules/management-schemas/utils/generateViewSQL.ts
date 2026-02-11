/**
 * SQL generators for PostgreSQL views and materialized views.
 * Used by the schema context menu to generate SQL statement templates.
 */

/**
 * Generate a DROP VIEW statement.
 * @param schemaName - The schema containing the view
 * @param viewName - The name of the view
 * @param isMaterialized - Whether it's a materialized view
 * @param cascade - Whether to add CASCADE option
 */
export function generateDropViewSQL(
  schemaName: string,
  viewName: string,
  isMaterialized = false,
  cascade = false
): string {
  const viewType = isMaterialized ? 'MATERIALIZED VIEW' : 'VIEW';
  const cascadeClause = cascade ? ' CASCADE' : '';
  return `DROP ${viewType} IF EXISTS "${schemaName}"."${viewName}"${cascadeClause};`;
}

/**
 * Generate an ALTER VIEW RENAME statement.
 * @param schemaName - The schema containing the view
 * @param oldName - Current view name
 * @param newName - New view name
 * @param isMaterialized - Whether it's a materialized view
 */
export function generateRenameViewSQL(
  schemaName: string,
  oldName: string,
  newName: string,
  isMaterialized = false
): string {
  const viewType = isMaterialized ? 'MATERIALIZED VIEW' : 'VIEW';
  return `ALTER ${viewType} "${schemaName}"."${oldName}" RENAME TO "${newName}";`;
}

/**
 * Generate a REFRESH MATERIALIZED VIEW statement.
 * @param schemaName - The schema containing the view
 * @param viewName - The name of the materialized view
 * @param concurrently - Whether to refresh concurrently (requires unique index)
 */
export function generateRefreshMaterializedViewSQL(
  schemaName: string,
  viewName: string,
  concurrently = false
): string {
  const concurrentlyClause = concurrently ? 'CONCURRENTLY ' : '';
  return `REFRESH MATERIALIZED VIEW ${concurrentlyClause}"${schemaName}"."${viewName}";`;
}

/**
 * Generate a SELECT statement for a view.
 * @param schemaName - The schema containing the view
 * @param viewName - The name of the view
 * @param columns - Optional array of column names
 */
export function generateViewSelectSQL(
  schemaName: string,
  viewName: string,
  columns?: string[]
): string {
  const colsStr = columns?.length ? columns.join(', ') : '*';
  return `SELECT ${colsStr}
FROM "${schemaName}"."${viewName}"
WHERE 1=1
-- Add your conditions here
LIMIT 100;`;
}
