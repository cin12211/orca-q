import { DatabaseClientType } from '~/core/constants/database-client-type';
import { BaseUnsupportedFunctionAdapter } from '../shared/base-unsupported-function.adapter';
import type { DatabaseFunctionAdapterParams } from '../types';

export class SqliteFunctionAdapter extends BaseUnsupportedFunctionAdapter {
  readonly dbType = DatabaseClientType.SQLITE3;

  static async create(
    params: DatabaseFunctionAdapterParams
  ): Promise<SqliteFunctionAdapter> {
    void params;
    return new SqliteFunctionAdapter();
  }
}
