import { createError } from 'h3';
import { SupportedDatabaseType, normalizeSupportedDatabaseType } from './types';
import type {
  BaseDatabaseAdapterParams,
  SupportedDatabaseTypeInput,
} from './types';

type AdapterFactories<TAdapter, TParams extends BaseDatabaseAdapterParams> = {
  [SupportedDatabaseType.POSTGRES]?: (params: TParams) => Promise<TAdapter>;
  [SupportedDatabaseType.MYSQL]?: (params: TParams) => Promise<TAdapter>;
  [SupportedDatabaseType.SQLITE]?: (params: TParams) => Promise<TAdapter>;
};

export async function createDomainAdapter<
  TAdapter,
  TParams extends BaseDatabaseAdapterParams,
>(
  dbType: SupportedDatabaseTypeInput,
  params: TParams,
  adapterName: string,
  factories: AdapterFactories<TAdapter, TParams>
): Promise<TAdapter> {
  const normalizedDbType = normalizeSupportedDatabaseType(dbType);
  const factory = factories[normalizedDbType];

  if (factory) {
    return factory(params);
  }

  if (normalizedDbType === SupportedDatabaseType.MYSQL) {
    throw createError({
      statusCode: 501,
      statusMessage: `MySQL ${adapterName} adapter not yet implemented`,
    });
  }

  if (normalizedDbType === SupportedDatabaseType.SQLITE) {
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
