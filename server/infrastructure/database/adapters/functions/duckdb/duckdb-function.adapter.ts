import { DatabaseClientType } from '~/core/constants/database-client-type';
import { BaseUnsupportedFunctionAdapter } from '../shared/base-unsupported-function.adapter';
import type { DatabaseFunctionAdapterParams } from '../types';

export class DuckDbFunctionAdapter extends BaseUnsupportedFunctionAdapter {
  readonly dbType = DatabaseClientType.DUCKDB;

  static async create(
    params: DatabaseFunctionAdapterParams
  ): Promise<DuckDbFunctionAdapter> {
    void params;
    return new DuckDbFunctionAdapter();
  }
}
