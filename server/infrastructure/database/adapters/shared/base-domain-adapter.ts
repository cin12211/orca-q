import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { IDatabaseAdapter } from '~/server/infrastructure/driver';
import { getDatabaseSource } from '~/server/infrastructure/driver/db-connection';
import type { BaseDatabaseAdapterParams } from './types';

export abstract class BaseDomainAdapter {
  protected readonly adapter: IDatabaseAdapter;

  protected constructor(adapter: IDatabaseAdapter) {
    this.adapter = adapter;
  }

  protected static async resolveAdapter(
    params: BaseDatabaseAdapterParams,
    dbType: DatabaseClientType
  ): Promise<IDatabaseAdapter> {
    return getDatabaseSource({
      dbConnectionString: params.dbConnectionString,
      type: dbType,
    });
  }

  protected async withTiming<T>(operation: () => Promise<T>): Promise<{
    result: T;
    queryTime: number;
  }> {
    const startTime = performance.now();
    const result = await operation();
    const endTime = performance.now();

    return {
      result,
      queryTime: Number((endTime - startTime).toFixed(2)),
    };
  }
}
