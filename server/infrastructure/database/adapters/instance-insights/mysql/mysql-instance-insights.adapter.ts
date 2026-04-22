import { DatabaseClientType } from '~/core/constants/database-client-type';
import { BaseUnsupportedInstanceInsightsAdapter } from '../shared/base-unsupported-instance-insights.adapter';
import type { InstanceInsightsAdapterParams } from '../types';

export class MysqlInstanceInsightsAdapter extends BaseUnsupportedInstanceInsightsAdapter {
  readonly dbType: DatabaseClientType;

  private constructor(dbType: DatabaseClientType) {
    super();
    this.dbType = dbType;
  }

  static async create(
    params: InstanceInsightsAdapterParams,
    dbType: DatabaseClientType = DatabaseClientType.MYSQL
  ): Promise<MysqlInstanceInsightsAdapter> {
    void params;
    return new MysqlInstanceInsightsAdapter(dbType);
  }
}
