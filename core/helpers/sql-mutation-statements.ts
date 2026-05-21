import { DatabaseClientType } from '~/core/constants/database-client-type';
import { getSqlDialect } from '~/core/sql-dialect';
import { getSqlDataColumnNames } from './sql-metadata';

type SqlRowValueMap = Record<string, unknown>;

interface SqlMutationStatementBaseOptions {
  schemaName: string;
  tableName: string;
  dbType?: DatabaseClientType;
}

interface SqlMutationMatchOptions extends SqlMutationStatementBaseOptions {
  pKeys: string[];
  pKeyValue: SqlRowValueMap;
}

interface BuildUpdateStatementsOptions extends SqlMutationMatchOptions {
  update: SqlRowValueMap;
}

interface BuildInsertStatementsOptions extends SqlMutationStatementBaseOptions {
  insertData: SqlRowValueMap;
}

interface ToSqlLiteralOptions {
  dbType?: DatabaseClientType;
}

export interface SqlMutationStatementResult {
  sql: string;
  noPkWarning: boolean;
}

export function toSqlLiteral(
  value: unknown,
  options: ToSqlLiteralOptions = {}
): string {
  return getSqlDialect(options.dbType).toLiteral(value);
}

const resolveColumnsToMatch = ({
  pKeys,
  pKeyValue,
}: Pick<SqlMutationMatchOptions, 'pKeys' | 'pKeyValue'>) => {
  const columnsToMatch = pKeys.length
    ? pKeys
    : getSqlDataColumnNames(pKeyValue);

  if (!columnsToMatch.length) {
    throw new Error('Invalid input: no columns to match for WHERE clause');
  }

  return {
    columnsToMatch,
    noPkWarning: pKeys.length === 0,
  };
};

const buildWhereClauseFromRow = (
  columnNames: string[],
  rowValues: SqlRowValueMap,
  dbType?: DatabaseClientType
) => {
  const dialect = getSqlDialect(dbType);

  return columnNames
    .map(columnName => {
      const value = rowValues[columnName];
      if (value === null || value === undefined) {
        return `${dialect.quoteIdentifier(columnName)} IS NULL`;
      }

      return `${dialect.quoteIdentifier(columnName)} = ${dialect.toLiteral(value)}`;
    })
    .join(' AND ');
};

export function buildDeleteStatements({
  schemaName,
  tableName,
  pKeys,
  pKeyValue,
  dbType,
}: SqlMutationMatchOptions): SqlMutationStatementResult {
  if (!tableName) {
    throw new Error('Invalid input: tableName is required');
  }

  const { columnsToMatch, noPkWarning } = resolveColumnsToMatch({
    pKeys,
    pKeyValue,
  });
  const dialect = getSqlDialect(dbType);
  const whereClause = buildWhereClauseFromRow(
    columnsToMatch,
    pKeyValue,
    dbType
  );
  const sql = `DELETE FROM ${dialect.qualifyTableName(tableName, schemaName)} WHERE ${whereClause}`;

  return { sql, noPkWarning };
}

export function buildUpdateStatements({
  schemaName,
  tableName,
  pKeys,
  pKeyValue,
  update,
  dbType,
}: BuildUpdateStatementsOptions): SqlMutationStatementResult {
  if (!tableName || !Object.keys(update).length) {
    throw new Error('Invalid input: tableName and update object are required');
  }

  const { columnsToMatch, noPkWarning } = resolveColumnsToMatch({
    pKeys,
    pKeyValue,
  });
  const dialect = getSqlDialect(dbType);
  const setClause = Object.entries(update)
    .map(
      ([columnName, value]) =>
        `${dialect.quoteIdentifier(columnName)} = ${dialect.toLiteral(value)}`
    )
    .join(', ');
  const whereClause = buildWhereClauseFromRow(
    columnsToMatch,
    pKeyValue,
    dbType
  );
  const sql = `UPDATE ${dialect.qualifyTableName(tableName, schemaName)} SET ${setClause} WHERE ${whereClause}`;

  return { sql, noPkWarning };
}

export function buildInsertStatements({
  schemaName,
  tableName,
  insertData,
  dbType,
}: BuildInsertStatementsOptions): string {
  if (!tableName || !insertData) {
    throw new Error('Invalid input: tableName, insertData object are required');
  }

  const dialect = getSqlDialect(dbType);

  if (!Object.keys(insertData).length) {
    return `INSERT INTO ${dialect.qualifyTableName(tableName, schemaName)} DEFAULT VALUES`;
  }

  const columnsClause = Object.keys(insertData)
    .map(columnName => dialect.quoteIdentifier(columnName))
    .join(', ');
  const valuesClause = Object.values(insertData)
    .map(value => dialect.toLiteral(value))
    .join(', ');

  return `INSERT INTO ${dialect.qualifyTableName(tableName, schemaName)} (${columnsClause}) VALUES (${valuesClause})`;
}
