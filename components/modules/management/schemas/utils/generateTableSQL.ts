/**
 * SQL generators for PostgreSQL tables.
 * Used by the schema context menu to generate SQL statement templates.
 */

/**
 * Generate a SELECT statement template.
 * @param schemaName - The schema containing the table
 * @param tableName - The name of the table
 * @param columns - Optional array of column names (defaults to *)
 */
export function generateSelectSQL(
  schemaName: string,
  tableName: string,
  columns?: string[]
): string {
  const colsStr = columns?.length ? columns.join(', ') : '*';
  return `SELECT ${colsStr}
FROM "${schemaName}"."${tableName}"
WHERE 1=1
-- Add your conditions here
LIMIT 100;`;
}

/**
 * Generate an INSERT statement template.
 * @param schemaName - The schema containing the table
 * @param tableName - The name of the table
 * @param columns - Optional array of column names
 */
export function generateInsertSQL(
  schemaName: string,
  tableName: string,
  columns?: string[]
): string {
  if (columns?.length) {
    const colsStr = columns.join(', ');
    const valuesPlaceholder = columns.map(() => '?').join(', ');
    return `INSERT INTO "${schemaName}"."${tableName}" (${colsStr})
VALUES (${valuesPlaceholder});`;
  }
  return `INSERT INTO "${schemaName}"."${tableName}" (column1, column2, ...)
VALUES (value1, value2, ...);`;
}

/**
 * Generate an UPDATE statement template.
 * @param schemaName - The schema containing the table
 * @param tableName - The name of the table
 * @param columns - Optional array of column names
 */
export function generateUpdateSQL(
  schemaName: string,
  tableName: string,
  columns?: string[]
): string {
  const setClause = columns?.length
    ? columns.map(col => `${col} = ?`).join(',\n  ')
    : 'column1 = value1,\n  column2 = value2';

  return `UPDATE "${schemaName}"."${tableName}"
SET
  ${setClause}
WHERE 1=0; -- Add your WHERE clause (safety: 1=0 to prevent accidental updates)`;
}

/**
 * Generate a DELETE statement template.
 * @param schemaName - The schema containing the table
 * @param tableName - The name of the table
 */
export function generateDeleteSQL(
  schemaName: string,
  tableName: string
): string {
  return `DELETE FROM "${schemaName}"."${tableName}"
WHERE 1=0; -- Add your WHERE clause (safety: 1=0 to prevent accidental deletes)`;
}

/**
 * Generate a MERGE statement template (PostgreSQL 15+).
 * @param schemaName - The schema containing the table
 * @param tableName - The name of the table
 */
export function generateMergeSQL(
  schemaName: string,
  tableName: string
): string {
  return `MERGE INTO "${schemaName}"."${tableName}" AS target
USING (SELECT column1, column2 FROM source_table) AS source
ON target.id = source.id
WHEN MATCHED THEN
  UPDATE SET column1 = source.column1
WHEN NOT MATCHED THEN
  INSERT (column1, column2)
  VALUES (source.column1, source.column2);`;
}

/**
 * Generate an INSERT ON CONFLICT statement template (UPSERT).
 * @param schemaName - The schema containing the table
 * @param tableName - The name of the table
 * @param columns - Optional array of column names
 * @param conflictColumns - Optional array of conflict target columns
 */
export function generateInsertOnConflictSQL(
  schemaName: string,
  tableName: string,
  columns?: string[],
  conflictColumns?: string[]
): string {
  const colsStr = columns?.length ? columns.join(', ') : 'column1, column2';
  const valuesPlaceholder = columns?.length
    ? columns.map(() => '?').join(', ')
    : 'value1, value2';
  const conflictCols = conflictColumns?.length
    ? conflictColumns.join(', ')
    : 'id';
  const updateClause = columns?.length
    ? columns.map(col => `${col} = EXCLUDED.${col}`).join(',\n    ')
    : 'column1 = EXCLUDED.column1';

  return `INSERT INTO "${schemaName}"."${tableName}" (${colsStr})
VALUES (${valuesPlaceholder})
ON CONFLICT (${conflictCols})
DO UPDATE SET
    ${updateClause};`;
}

/**
 * Generate an UPDATE FROM statement template (PostgreSQL).
 * @param schemaName - The schema containing the table
 * @param tableName - The name of the table
 */
export function generateUpdateFromSQL(
  schemaName: string,
  tableName: string
): string {
  return `UPDATE "${schemaName}"."${tableName}" AS t
SET column1 = s.column1
FROM source_table AS s
WHERE t.id = s.id;`;
}

/**
 * Generate a DELETE USING statement template (PostgreSQL).
 * @param schemaName - The schema containing the table
 * @param tableName - The name of the table
 */
export function generateDeleteUsingSQL(
  schemaName: string,
  tableName: string
): string {
  return `DELETE FROM "${schemaName}"."${tableName}" AS t
USING source_table AS s
WHERE t.id = s.id;`;
}

/**
 * Generate a CREATE TABLE DDL statement template.
 * Note: For actual DDL, use the table structure API endpoint.
 * @param schemaName - The schema containing the table
 * @param tableName - The name of the table
 */
export function generateTableDDLTemplate(
  schemaName: string,
  tableName: string
): string {
  return `-- DDL for ${schemaName}.${tableName}
-- Use 'Get Table Structure' API for actual DDL
CREATE TABLE "${schemaName}"."${tableName}" (
  id SERIAL PRIMARY KEY,
  column1 VARCHAR(255),
  column2 INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`;
}

/**
 * Export data as SQL INSERT statements.
 * @param schemaName - The schema containing the table
 * @param tableName - The name of the table
 * @param data - Array of row data objects
 */
export function generateExportAsSQL(
  schemaName: string,
  tableName: string,
  data: Record<string, unknown>[]
): string {
  if (!data || data.length === 0) {
    return `-- No data to export from ${schemaName}.${tableName}`;
  }

  const columns = Object.keys(data[0]);
  const colsStr = columns.map(c => `"${c}"`).join(', ');

  const statements = data.map(row => {
    const values = columns.map(col => {
      const value = row[col];
      if (value === null || value === undefined) {
        return 'NULL';
      }
      if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
      }
      // Escape single quotes
      return `'${String(value).replace(/'/g, "''")}'`;
    });
    return `INSERT INTO "${schemaName}"."${tableName}" (${colsStr}) VALUES (${values.join(', ')});`;
  });

  return statements.join('\n');
}

/**
 * Generate a DROP TABLE statement.
 * @param schemaName - The schema containing the table
 * @param tableName - The name of the table
 * @param cascade - Whether to add CASCADE option
 */
export function generateDropTableSQL(
  schemaName: string,
  tableName: string,
  cascade = false
): string {
  const cascadeClause = cascade ? ' CASCADE' : '';
  return `DROP TABLE IF EXISTS "${schemaName}"."${tableName}"${cascadeClause};`;
}

/**
 * Generate an ALTER TABLE RENAME statement.
 * @param schemaName - The schema containing the table
 * @param oldName - Current table name
 * @param newName - New table name
 */
export function generateRenameTableSQL(
  schemaName: string,
  oldName: string,
  newName: string
): string {
  return `ALTER TABLE "${schemaName}"."${oldName}" RENAME TO "${newName}";`;
}
