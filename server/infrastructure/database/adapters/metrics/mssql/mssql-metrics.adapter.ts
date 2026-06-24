import { DatabaseClientType } from '~/core/constants/database-client-type';
import { BaseUnsupportedMetricsAdapter } from '../shared/base-unsupported-metrics.adapter';
import type { DatabaseMetricsAdapterParams } from '../types';

export class MssqlMetricsAdapter extends BaseUnsupportedMetricsAdapter {
  readonly dbType = DatabaseClientType.MSSQL;

  static async create(
    params: DatabaseMetricsAdapterParams
  ): Promise<MssqlMetricsAdapter> {
    void params;
    return new MssqlMetricsAdapter();
  }
}
