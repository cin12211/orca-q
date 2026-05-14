import { DatabaseClientType } from '~/core/constants/database-client-type';
import { qualifySqlTableName, quoteSqlIdentifier } from './sqlIdentifier';
import { getSqlDataColumnNames, toSqlLiteral } from './sqlLiteral';

export const differentObject = (
  oldValue: Record<string, unknown>,
  newValue: Record<string, unknown>
) => {
  const diff: Record<string, unknown> = {};

  Object.keys(oldValue).forEach(key => {
    if (oldValue[key] !== newValue[key]) {
      diff[key] = newValue[key];

      return true;
    }
    return false;
  });

  return diff;
};

export interface UpdateStatementResult {
  /** The generated UPDATE SQL statement. */
  sql: string;
  /**
   * True when the table has no primary key — the WHERE clause uses all columns,
   * which may match multiple rows. Callers must show a danger confirmation before
   * executing.
   */
  noPkWarning: boolean;
}

export function buildUpdateStatements({
  schemaName,
  tableName,
  pKeys,
  update,
  pKeyValue,
  dbType,
}: {
  schemaName: string;
  tableName: string;
  pKeys: string[];
  pKeyValue: Record<string, unknown>;
  update: Record<string, unknown>;
  dbType?: DatabaseClientType | string;
}): UpdateStatementResult {
  // Validate inputs
  if (!tableName || !update || !Object.keys(update).length) {
    throw new Error('Invalid input: tableName and update object are required');
  }

  const noPkWarning = !pKeys?.length;
  const columnsToMatch = pKeys?.length
    ? pKeys
    : getSqlDataColumnNames(pKeyValue);

  if (!columnsToMatch.length) {
    throw new Error('Invalid input: no columns to match for WHERE clause');
  }

  // Build SET clause
  const setClause = Object.entries(update)
    .map(([column, value]) => {
      return `${quoteSqlIdentifier(column, dbType)} = ${toSqlLiteral(value, { dbType })}`;
    })
    .join(', ');

  // Build WHERE clause — uses all columns when no PK to maximally scope the match
  const whereClause = columnsToMatch
    .map(key => {
      const value = pKeyValue[key];
      if (value === null || value === undefined) {
        return `${quoteSqlIdentifier(key, dbType)} IS NULL`;
      }
      return `${quoteSqlIdentifier(key, dbType)} = ${toSqlLiteral(value, { dbType })}`;
    })
    .join(' AND ');

  const sql = `UPDATE ${qualifySqlTableName({ schemaName, tableName, dbType })} SET ${setClause} WHERE ${whereClause}`;

  return { sql, noPkWarning };
}
