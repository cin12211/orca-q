/**
 * SQL generators for PostgreSQL functions.
 * Used by the schema context menu to generate SQL statements.
 */

/**
 * Generate a CALL statement for a function/procedure.
 * @param schemaName - The schema containing the function
 * @param functionName - The name of the function
 * @param args - Optional array of argument placeholders
 */
export function generateFunctionCallSQL(
  schemaName: string,
  functionName: string,
  args?: string[]
): string {
  const argsStr = args?.length ? args.join(', ') : '';
  return `CALL "${schemaName}"."${functionName}"(${argsStr});`;
}

/**
 * Generate a SELECT statement to call a function (for functions returning results).
 * @param schemaName - The schema containing the function
 * @param functionName - The name of the function
 * @param args - Optional array of argument placeholders
 */
export function generateFunctionSelectSQL(
  schemaName: string,
  functionName: string,
  args?: string[]
): string {
  const argsStr = args?.length ? args.join(', ') : '';
  return `SELECT * FROM "${schemaName}"."${functionName}"(${argsStr});`;
}

/**
 * Format function DDL for display.
 * The DDL is already retrieved from pg_get_functiondef via API.
 * This just ensures proper formatting.
 * @param functionDef - The function definition from pg_get_functiondef
 */
export function formatFunctionDDL(functionDef: string): string {
  if (!functionDef) {
    return '-- Function definition not available';
  }
  return functionDef.trim();
}

export const getFormatParameters = (parameters?: string) => {
  return (parameters || '')
    .split(',')
    .map(param => param.trim().split(' ')[1])
    .join(', ');
};

/**
 * Generate a DROP FUNCTION statement.
 * @param schemaName - The schema containing the function
 * @param functionName - The name of the function
 * @param cascade - Whether to add CASCADE option
 */
export function generateDropFunctionSQL(
  schemaName: string,
  functionName: string,
  cascade = false,
  parameters?: string
): string {
  const formatParameters = getFormatParameters(parameters);

  const cascadeClause = cascade ? ' CASCADE' : '';
  return `DROP FUNCTION IF EXISTS "${schemaName}"."${functionName}"(${formatParameters})${cascadeClause};`;
}

/**
 * Generate an ALTER FUNCTION RENAME statement.
 * @param schemaName - The schema containing the function
 * @param oldName - Current function name
 * @param newName - New function name
 */
export function generateRenameFunctionSQL(
  schemaName: string,
  oldName: string,
  newName: string,
  parameters?: string
): string {
  const formatParameters = getFormatParameters(parameters);

  return `ALTER FUNCTION "${schemaName}"."${oldName}"(${formatParameters}) RENAME TO "${newName}";`;
}
