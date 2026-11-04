import { DatabaseClientType } from '~/core/constants/database-client-type';
import { BaseUnsupportedViewAdapter } from '../shared/base-unsupported-view.adapter';
import type { DatabaseViewAdapterParams } from '../types';

export class MysqlViewAdapter extends BaseUnsupportedViewAdapter {
  readonly dbType: DatabaseClientType;

  private constructor(dbType: DatabaseClientType) {
    super();
    this.dbType = dbType;
  }

  static async create(
    params: DatabaseViewAdapterParams,
    dbType: DatabaseClientType = DatabaseClientType.MYSQL
  ): Promise<MysqlViewAdapter> {
    void params;
    return new MysqlViewAdapter(dbType);
  }
}
