import { DatabaseClientType } from '~/core/constants/database-client-type';
import { BaseUnsupportedRoleAdapter } from '../shared/base-unsupported-role.adapter';
import type { DatabaseRoleAdapterParams } from '../types';

export class MssqlRoleAdapter extends BaseUnsupportedRoleAdapter {
  readonly dbType = DatabaseClientType.MSSQL;

  static async create(
    params: DatabaseRoleAdapterParams
  ): Promise<MssqlRoleAdapter> {
    void params;
    return new MssqlRoleAdapter();
  }
}
