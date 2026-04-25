import { DatabaseClientType } from '~/core/constants/database-client-type';
import { BaseUnsupportedMetricsAdapter } from '../shared/base-unsupported-metrics.adapter';
import type { DatabaseMetricsAdapterParams } from '../types';

export class MysqlMetricsAdapter extends BaseUnsupportedMetricsAdapter {
  readonly dbType: DatabaseClientType;

  private constructor(dbType: DatabaseClientType) {
    super();
    this.dbType = dbType;
  }

  static async create(
    params: DatabaseMetricsAdapterParams,
    dbType: DatabaseClientType = DatabaseClientType.MYSQL
  ): Promise<MysqlMetricsAdapter> {
    void params;
    return new MysqlMetricsAdapter(dbType);
  }
}
