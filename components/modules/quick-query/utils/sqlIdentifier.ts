import { DatabaseClientType } from '~/core/constants/database-client-type';

function usesBacktickIdentifiers(dbType?: DatabaseClientType | string) {
  return [
    DatabaseClientType.MYSQL,
    DatabaseClientType.MYSQL2,
    DatabaseClientType.MARIADB,
  ].includes(dbType as DatabaseClientType);
}

export function quoteSqlIdentifier(
  identifier: string,
  dbType?: DatabaseClientType | string
) {
  if (usesBacktickIdentifiers(dbType)) {
    return `\`${identifier.replace(/`/g, '``')}\``;
  }

  return `"${identifier.replace(/"/g, '""')}"`;
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
  const quotedTableName = quoteSqlIdentifier(tableName, dbType);

  if (!schemaName) {
    return quotedTableName;
  }

  return `${quoteSqlIdentifier(schemaName, dbType)}.${quotedTableName}`;
}
