import { createError } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { normalizeSupportedDatabaseType } from './types';
import type { BaseDatabaseAdapterParams } from './types';

type AdapterFactories<
  TAdapter,
  TParams extends BaseDatabaseAdapterParams,
> = Partial<Record<DatabaseClientType, (params: TParams) => Promise<TAdapter>>>;

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
      statusMessage: `MySQL ${adapterName} adapter not yet implemented`,
    });
  }

  if (normalizedDbType === DatabaseClientType.SQLITE3) {
    throw createError({
      statusCode: 501,
      statusMessage: `SQLite ${adapterName} adapter not yet implemented`,
    });
  }

  throw createError({
    statusCode: 400,
    statusMessage: `Unsupported database type: ${normalizedDbType}`,
  });
}
