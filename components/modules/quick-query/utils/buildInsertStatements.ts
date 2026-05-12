import { DatabaseClientType } from '~/core/constants/database-client-type';
import { qualifySqlTableName, quoteSqlIdentifier } from './sqlIdentifier';
import { toSqlLiteral } from './sqlLiteral';

export function buildInsertStatements({
  schemaName,
  tableName,
  insertData,
  dbType,
}: {
  schemaName: string;
  tableName: string;
  insertData: Record<string, any>;
  dbType?: DatabaseClientType | string;
}): string {
  // Validate inputs
  if (!tableName || !insertData) {
    throw new Error('Invalid input: tableName, insertData object are required');
  }

  if (!Object.keys(insertData).length) {
    return `INSERT INTO ${qualifySqlTableName({ schemaName, tableName, dbType })} DEFAULT VALUES`;
  }

  const columnsClause = Object.entries(insertData)
    .map(([column]) => {
      return quoteSqlIdentifier(column, dbType);
    })
    .join(', ');

  const valuesClause = Object.values(insertData)
    .map(value => toSqlLiteral(value))
    .join(', ');

  // Construct final query
  const query = `INSERT INTO ${qualifySqlTableName({ schemaName, tableName, dbType })} (${columnsClause}) VALUES (${valuesClause})`;

  return query;
}
