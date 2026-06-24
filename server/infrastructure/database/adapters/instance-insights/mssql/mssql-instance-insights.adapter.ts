import { DatabaseClientType } from '~/core/constants/database-client-type';
import { BaseUnsupportedInstanceInsightsAdapter } from '../shared/base-unsupported-instance-insights.adapter';
import type { InstanceInsightsAdapterParams } from '../types';

export class MssqlInstanceInsightsAdapter extends BaseUnsupportedInstanceInsightsAdapter {
  readonly dbType = DatabaseClientType.MSSQL;

  static async create(
    params: InstanceInsightsAdapterParams
  ): Promise<MssqlInstanceInsightsAdapter> {
    void params;
    return new MssqlInstanceInsightsAdapter();
  }
}
