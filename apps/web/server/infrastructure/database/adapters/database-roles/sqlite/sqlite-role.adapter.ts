import { DatabaseClientType } from '~/core/constants/database-client-type';
import { BaseUnsupportedRoleAdapter } from '../shared/base-unsupported-role.adapter';
import type { DatabaseRoleAdapterParams } from '../types';

export class SqliteRoleAdapter extends BaseUnsupportedRoleAdapter {
  readonly dbType = DatabaseClientType.SQLITE3;

  static async create(
    params: DatabaseRoleAdapterParams
  ): Promise<SqliteRoleAdapter> {
    void params;
    return new SqliteRoleAdapter();
  }
}
