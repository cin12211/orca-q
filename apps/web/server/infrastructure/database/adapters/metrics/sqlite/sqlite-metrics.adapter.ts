import { DatabaseClientType } from '~/core/constants/database-client-type';
import { BaseUnsupportedMetricsAdapter } from '../shared/base-unsupported-metrics.adapter';
import type { DatabaseMetricsAdapterParams } from '../types';

export class SqliteMetricsAdapter extends BaseUnsupportedMetricsAdapter {
  readonly dbType = DatabaseClientType.SQLITE3;

  static async create(
    params: DatabaseMetricsAdapterParams
  ): Promise<SqliteMetricsAdapter> {
    void params;
    return new SqliteMetricsAdapter();
  }
}
