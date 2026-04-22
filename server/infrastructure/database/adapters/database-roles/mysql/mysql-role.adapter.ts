import { DatabaseClientType } from '~/core/constants/database-client-type';
import { BaseUnsupportedRoleAdapter } from '../shared/base-unsupported-role.adapter';
import type { DatabaseRoleAdapterParams } from '../types';

export class MysqlRoleAdapter extends BaseUnsupportedRoleAdapter {
  readonly dbType: DatabaseClientType;

  private constructor(dbType: DatabaseClientType) {
    super();
    this.dbType = dbType;
  }

  static async create(
    params: DatabaseRoleAdapterParams,
    dbType: DatabaseClientType = DatabaseClientType.MYSQL
  ): Promise<MysqlRoleAdapter> {
    void params;
    return new MysqlRoleAdapter(dbType);
  }
}
