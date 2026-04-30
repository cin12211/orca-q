import { DatabaseClientType } from '~/core/constants/database-client-type';
import { qualifySqlTableName, quoteSqlIdentifier } from './sqlIdentifier';

export const differentObject = (
  oldValue: Record<string, any>,
  newValue: Record<string, any>
) => {
  const diff: Record<string, any> = {};

  Object.keys(oldValue).forEach(key => {
    if (oldValue[key] !== newValue[key]) {
      diff[key] = newValue[key];

      return true;
    }
    return false;
  });

  return diff;
};

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
  pKeyValue: Record<string, string>;
  update: Record<string, any>;
  dbType?: DatabaseClientType | string;
}): string {
  // Validate inputs
  if (!tableName || !pKeys?.length || !update || !Object.keys(update).length) {
    throw new Error(
      'Invalid input: tableName, pKeys, and update object are required'
    );
  }

  // Build SET clause
  // Build SET clause
  const setClause = Object.entries(update)
    .map(([column, value]) => {
      // Handle different value types
      if (value === null) {
        return `${quoteSqlIdentifier(column, dbType)} = NULL`;
      }
      if (typeof value === 'string') {
        return `${quoteSqlIdentifier(column, dbType)} = '${value.replace(/'/g, "''")}'`; // Escape single quotes
      }
      return `${quoteSqlIdentifier(column, dbType)} = ${value}`;
    })
    .join(', ');

  // Build WHERE clause
  const whereClause = pKeys
    .map(key => `${quoteSqlIdentifier(key, dbType)} = '${pKeyValue[key]}'`)
    .join(' AND ');

  // Construct final query
  const query = `UPDATE ${qualifySqlTableName({ schemaName, tableName, dbType })} SET ${setClause} WHERE ${whereClause}`;

  return query;
}
