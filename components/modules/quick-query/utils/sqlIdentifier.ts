import { DatabaseClientType } from '~/core/constants/database-client-type';
import { getSqlDialect } from '~/core/sql-dialect';

export function quoteSqlIdentifier(
  identifier: string,
  dbType?: DatabaseClientType | string
) {
  return getSqlDialect(dbType).quoteIdentifier(identifier);
}

export function qualifySqlTableName({
  schemaName,
  tableName,
  dbType,
}: {
  schemaName?: string;
  tableName: string;
  dbType?: DatabaseClientType | string;
}) {
  return getSqlDialect(dbType).qualifyTableName(tableName, schemaName);
}
