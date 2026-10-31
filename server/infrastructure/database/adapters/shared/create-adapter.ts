import { createError } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { normalizeSupportedDatabaseType } from './types';
import type { BaseDatabaseAdapterParams } from './types';

type AdapterFactories<
  TAdapter,
  TParams extends BaseDatabaseAdapterParams,
> = Partial<Record<DatabaseClientType, (params: TParams) => Promise<TAdapter>>>;

// Known SQL engines get a 501 "not available" instead of a 400 so the UI can
// show a clear unsupported-feature state for domains they do not implement.
const KNOWN_SQL_DATABASE_TYPES = new Set<DatabaseClientType>([
  DatabaseClientType.MYSQL,
  DatabaseClientType.MARIADB,
  DatabaseClientType.ORACLE,
  DatabaseClientType.SQLITE3,
  DatabaseClientType.MSSQL,
  DatabaseClientType.COCKROACHDB,
]);

function getDatabaseLabel(dbType: DatabaseClientType): string {
  switch (dbType) {
    case DatabaseClientType.MYSQL:
      return 'MySQL';
    case DatabaseClientType.MARIADB:
      return 'MariaDB';
    case DatabaseClientType.ORACLE:
      return 'Oracle';
    case DatabaseClientType.SQLITE3:
      return 'SQLite';
    case DatabaseClientType.MSSQL:
      return 'SQL Server';
    case DatabaseClientType.COCKROACHDB:
      return 'CockroachDB';
    default:
      return dbType;
  }
}

export async function createDomainAdapter<
  TAdapter,
  TParams extends BaseDatabaseAdapterParams,
>(
  dbType: DatabaseClientType | undefined,
  params: TParams,
  adapterName: string,
  factories: AdapterFactories<TAdapter, TParams>
): Promise<TAdapter> {
  if (!dbType) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Database type is required',
    });
  }
  const normalizedDbType = normalizeSupportedDatabaseType(dbType);
  const factory = factories[normalizedDbType];

  if (factory) {
    return factory(params);
  }

  if (KNOWN_SQL_DATABASE_TYPES.has(normalizedDbType)) {
    throw createError({
      statusCode: 501,
      statusMessage: `${getDatabaseLabel(normalizedDbType)} ${adapterName} support is not available`,
    });
  }

  throw createError({
    statusCode: 400,
    statusMessage: `Unsupported database type: ${normalizedDbType}`,
  });
}
