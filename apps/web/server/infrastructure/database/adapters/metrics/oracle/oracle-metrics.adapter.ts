import { DatabaseClientType } from '~/core/constants/database-client-type';
import { BaseUnsupportedMetricsAdapter } from '../shared/base-unsupported-metrics.adapter';
import type { DatabaseMetricsAdapterParams } from '../types';

export class OracleMetricsAdapter extends BaseUnsupportedMetricsAdapter {
  readonly dbType = DatabaseClientType.ORACLE;

  static async create(
    params: DatabaseMetricsAdapterParams
  ): Promise<OracleMetricsAdapter> {
    void params;
    return new OracleMetricsAdapter();
  }
}
