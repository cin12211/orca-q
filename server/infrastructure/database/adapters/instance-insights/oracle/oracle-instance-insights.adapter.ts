import { DatabaseClientType } from '~/core/constants/database-client-type';
import { BaseUnsupportedInstanceInsightsAdapter } from '../shared/base-unsupported-instance-insights.adapter';
import type { InstanceInsightsAdapterParams } from '../types';

export class OracleInstanceInsightsAdapter extends BaseUnsupportedInstanceInsightsAdapter {
  readonly dbType = DatabaseClientType.ORACLE;

  static async create(
    params: InstanceInsightsAdapterParams
  ): Promise<OracleInstanceInsightsAdapter> {
    void params;
    return new OracleInstanceInsightsAdapter();
  }
}
