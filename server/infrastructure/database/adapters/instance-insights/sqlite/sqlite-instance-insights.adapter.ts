import { DatabaseClientType } from '~/core/constants/database-client-type';
import { BaseUnsupportedInstanceInsightsAdapter } from '../shared/base-unsupported-instance-insights.adapter';
import type { InstanceInsightsAdapterParams } from '../types';

export class SqliteInstanceInsightsAdapter extends BaseUnsupportedInstanceInsightsAdapter {
  readonly dbType = DatabaseClientType.SQLITE3;

  static async create(
    params: InstanceInsightsAdapterParams
  ): Promise<SqliteInstanceInsightsAdapter> {
    void params;
    return new SqliteInstanceInsightsAdapter();
  }
}
