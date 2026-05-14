import { DatabaseClientType } from '~/core/constants/database-client-type';
import { qualifySqlTableName, quoteSqlIdentifier } from './sqlIdentifier';
import { toSqlLiteral } from './sqlLiteral';

export interface DeleteStatementResult {
  /** The generated DELETE SQL statement. */
  sql: string;
  /**
   * True when the table has no primary key — the WHERE clause uses all columns,
   * which may match multiple rows. Callers must show a danger confirmation before
   * executing.
   */
  noPkWarning: boolean;
}

export function buildDeleteStatements({
  schemaName,
  tableName,
  pKeys,
  pKeyValue,
  dbType,
}: {
  schemaName: string;
  tableName: string;
  pKeys: string[];
  pKeyValue: Record<string, unknown>;
  dbType?: DatabaseClientType | string;
}): DeleteStatementResult {
  if (!tableName) {
    throw new Error('Invalid input: tableName is required');
  }

  const noPkWarning = !pKeys?.length;
  const columnsToMatch = pKeys?.length ? pKeys : Object.keys(pKeyValue);

  if (!columnsToMatch.length) {
    throw new Error('Invalid input: no columns to match for WHERE clause');
  }

  // Build WHERE clause — uses all columns when no PK to maximally scope the match
  const whereClause = columnsToMatch
    .map(key => {
      const value = pKeyValue[key];
      if (value === null || value === undefined) {
        return `${quoteSqlIdentifier(key, dbType)} IS NULL`;
      }
      return `${quoteSqlIdentifier(key, dbType)} = ${toSqlLiteral(value)}`;
    })
    .join(' AND ');

  const sql = `DELETE FROM ${qualifySqlTableName({ schemaName, tableName, dbType })} WHERE ${whereClause}`;

  return { sql, noPkWarning };
}
