import { createError } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { normalizeSupportedDatabaseType } from './types';
import type { BaseDatabaseAdapterParams } from './types';

type AdapterFactories<
  TAdapter,
  TParams extends BaseDatabaseAdapterParams,
> = Partial<Record<DatabaseClientType, (params: TParams) => Promise<TAdapter>>>;

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
    default:
      return dbType;
  }
}

export async function createDomainAdapter<
  TAdapter,
  TParams extends BaseDatabaseAdapterParams,
>(
  dbType: DatabaseClientType,
  params: TParams,
  adapterName: string,
  factories: AdapterFactories<TAdapter, TParams>
): Promise<TAdapter> {
  const normalizedDbType = normalizeSupportedDatabaseType(dbType);
  const factory = factories[normalizedDbType];

  if (factory) {
    return factory(params);
  }

  if (normalizedDbType === DatabaseClientType.MYSQL) {
    throw createError({
      statusCode: 501,
      statusMessage: `${getDatabaseLabel(normalizedDbType)} ${adapterName} support is not available`,
    });
  }

  if (normalizedDbType === DatabaseClientType.MARIADB) {
    throw createError({
      statusCode: 501,
      statusMessage: `${getDatabaseLabel(normalizedDbType)} ${adapterName} support is not available`,
    });
  }

  if (normalizedDbType === DatabaseClientType.ORACLE) {
    throw createError({
      statusCode: 501,
      statusMessage: `${getDatabaseLabel(normalizedDbType)} ${adapterName} support is not available`,
    });
  }

  if (normalizedDbType === DatabaseClientType.SQLITE3) {
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
