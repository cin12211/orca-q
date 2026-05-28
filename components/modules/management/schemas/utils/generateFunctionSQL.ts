/**
 * SQL generators for database functions/procedures.
 * Used by the schema context menu and the function editor to generate SQL statements.
 */

import { DatabaseClientType } from '~/core/constants/database-client-type';

export type RoutineDefinitionType = 'FUNCTION' | 'PROCEDURE';

// Matches:
//   CREATE OR REPLACE FUNCTION/PROCEDURE  (PostgreSQL, MySQL)
//   CREATE OR ALTER  FUNCTION/PROCEDURE   (T-SQL / MSSQL)
//   CREATE           FUNCTION/PROCEDURE   (MSSQL, Oracle, etc.)
//   ALTER            FUNCTION/PROCEDURE   (MSSQL after transform)
const ROUTINE_DEFINITION_PATTERN =
  /^(?:create(?:\s+or\s+(?:replace|alter))?|alter)\s+(function|procedure)\b/i;

// Matches the CREATE prefix (with any optional OR REPLACE / OR ALTER clause) to be replaced with ALTER.
const MSSQL_CREATE_TO_ALTER_PATTERN =
  /^(create(?:\s+or\s+(?:replace|alter))?)(\s+(?:function|procedure)\b)/i;

// Matches the CREATE prefix (with optional OR REPLACE) to be replaced with CREATE OR REPLACE.
const CREATE_TO_CREATE_OR_REPLACE_PATTERN =
  /^(create(?:\s+or\s+replace)?)(\s+(?:function|procedure)\b)/i;

/**
 * For MSSQL, convert `CREATE [OR ALTER] FUNCTION/PROCEDURE` to `ALTER FUNCTION/PROCEDURE`.
 * MSSQL does not support CREATE OR REPLACE; the correct DDL keyword is ALTER.
 * Returns the original string unchanged for all other inputs.
 */
export function convertCreateToAlterMssql(sql: string): string {
  return sql.replace(MSSQL_CREATE_TO_ALTER_PATTERN, (_, _createClause, routineKind) =>
    `ALTER${routineKind}`
  );
}

/**
 * For PostgreSQL, MySQL, MariaDB, Oracle, convert `CREATE FUNCTION/PROCEDURE` to `CREATE OR REPLACE FUNCTION/PROCEDURE`.
 */
export function convertCreateToCreateOrReplace(sql: string): string {
  return sql.replace(CREATE_TO_CREATE_OR_REPLACE_PATTERN, (_, _createClause, routineKind) =>
    `CREATE OR REPLACE${routineKind}`
  );
}

export function getRoutineDefinitionType(
  functionDef: string
): RoutineDefinitionType | null {
  const match = functionDef.trim().match(ROUTINE_DEFINITION_PATTERN);

  if (!match) {
    return null;
  }

  return match[1].toUpperCase() as RoutineDefinitionType;
}

export function generateRoutineUpdateSQL(
  functionDef: string,
  dbType?: DatabaseClientType
): string {
  const trimmed = functionDef.trim();

  if (!trimmed) {
    return '';
  }

  const normalized = `${trimmed.replace(/;+\s*$/, '')};`;

  // MSSQL does not support CREATE OR REPLACE — rewrite to ALTER automatically.
  if (dbType === DatabaseClientType.MSSQL) {
    return convertCreateToAlterMssql(normalized);
  }

  // PostgreSQL, MySQL, MariaDB, Oracle support CREATE OR REPLACE — rewrite automatically.
  if (
    dbType === DatabaseClientType.POSTGRES ||
    dbType === DatabaseClientType.MYSQL ||
    dbType === DatabaseClientType.MYSQL2 ||
    dbType === DatabaseClientType.MARIADB ||
    dbType === DatabaseClientType.ORACLE
  ) {
    return convertCreateToCreateOrReplace(normalized);
  }

  return normalized;
}

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
