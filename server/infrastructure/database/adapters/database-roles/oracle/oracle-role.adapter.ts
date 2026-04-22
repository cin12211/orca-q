import { DatabaseClientType } from '~/core/constants/database-client-type';
import { BaseUnsupportedRoleAdapter } from '../shared/base-unsupported-role.adapter';
import type { DatabaseRoleAdapterParams } from '../types';

export class OracleRoleAdapter extends BaseUnsupportedRoleAdapter {
  readonly dbType = DatabaseClientType.ORACLE;

  static async create(
    params: DatabaseRoleAdapterParams
  ): Promise<OracleRoleAdapter> {
    void params;
    return new OracleRoleAdapter();
  }
}
