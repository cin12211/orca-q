import { DatabaseClientType } from '~/core/constants/database-client-type';
import { BaseUnsupportedFunctionAdapter } from '../shared/base-unsupported-function.adapter';
import type { DatabaseFunctionAdapterParams } from '../types';

export class OracleFunctionAdapter extends BaseUnsupportedFunctionAdapter {
  readonly dbType = DatabaseClientType.ORACLE;

  static async create(
    params: DatabaseFunctionAdapterParams
  ): Promise<OracleFunctionAdapter> {
    void params;
    return new OracleFunctionAdapter();
  }
}
