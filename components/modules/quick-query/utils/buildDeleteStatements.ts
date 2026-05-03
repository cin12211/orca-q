import { DatabaseClientType } from '~/core/constants/database-client-type';
import { qualifySqlTableName, quoteSqlIdentifier } from './sqlIdentifier';

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
  pKeyValue: Record<string, string>;
  dbType?: DatabaseClientType | string;
}): string {
  // Validate inputs
  if (!tableName || !pKeys?.length) {
    throw new Error('Invalid input: tableName and pKeys are required');
  }

  // Build WHERE clause
  const whereClause = pKeys
    .map(key => `${quoteSqlIdentifier(key, dbType)} = '${pKeyValue[key]}'`)
    .join(' AND ');

  // Construct final query
  const query = `DELETE FROM ${qualifySqlTableName({ schemaName, tableName, dbType })} WHERE ${whereClause}`;

  return query;
}
