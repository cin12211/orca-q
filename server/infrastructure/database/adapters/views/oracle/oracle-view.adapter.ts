import { DatabaseClientType } from '~/core/constants/database-client-type';
import { BaseUnsupportedViewAdapter } from '../shared/base-unsupported-view.adapter';
import type { DatabaseViewAdapterParams } from '../types';

export class OracleViewAdapter extends BaseUnsupportedViewAdapter {
  readonly dbType = DatabaseClientType.ORACLE;

  static async create(
    params: DatabaseViewAdapterParams
  ): Promise<OracleViewAdapter> {
    void params;
    return new OracleViewAdapter();
  }
}
