import { DatabaseClientType } from '~/core/constants/database-client-type';
import { BaseUnsupportedViewAdapter } from '../shared/base-unsupported-view.adapter';
import type { DatabaseViewAdapterParams } from '../types';

export class MssqlViewAdapter extends BaseUnsupportedViewAdapter {
  readonly dbType = DatabaseClientType.MSSQL;

  static async create(
    params: DatabaseViewAdapterParams
  ): Promise<MssqlViewAdapter> {
    void params;
    return new MssqlViewAdapter();
  }
}
