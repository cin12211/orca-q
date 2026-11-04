import { DatabaseClientType } from '~~/app/core/constants/database-client-type';
import { BaseUnsupportedMetricsAdapter } from '../shared/base-unsupported-metrics.adapter';
import type { DatabaseMetricsAdapterParams } from '../types';

export class DuckDbMetricsAdapter extends BaseUnsupportedMetricsAdapter {
  readonly dbType = DatabaseClientType.DUCKDB;

  static async create(
    params: DatabaseMetricsAdapterParams
  ): Promise<DuckDbMetricsAdapter> {
    void params;
    return new DuckDbMetricsAdapter();
  }
}
