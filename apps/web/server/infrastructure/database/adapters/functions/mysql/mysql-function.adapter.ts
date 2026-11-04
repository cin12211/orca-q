import { DatabaseClientType } from '~/core/constants/database-client-type';
import { BaseUnsupportedFunctionAdapter } from '../shared/base-unsupported-function.adapter';
import type { DatabaseFunctionAdapterParams } from '../types';

export class MysqlFunctionAdapter extends BaseUnsupportedFunctionAdapter {
  readonly dbType: DatabaseClientType;

  private constructor(dbType: DatabaseClientType) {
    super();
    this.dbType = dbType;
  }

  static async create(
    params: DatabaseFunctionAdapterParams,
    dbType: DatabaseClientType = DatabaseClientType.MYSQL
  ): Promise<MysqlFunctionAdapter> {
    void params;
    return new MysqlFunctionAdapter(dbType);
  }
}
