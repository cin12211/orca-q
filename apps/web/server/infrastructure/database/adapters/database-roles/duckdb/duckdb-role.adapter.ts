import { DatabaseClientType } from '~~/app/core/constants/database-client-type';
import { BaseUnsupportedRoleAdapter } from '../shared/base-unsupported-role.adapter';
import type { DatabaseRoleAdapterParams } from '../types';

export class DuckDbRoleAdapter extends BaseUnsupportedRoleAdapter {
  readonly dbType = DatabaseClientType.DUCKDB;

  static async create(
    params: DatabaseRoleAdapterParams
  ): Promise<DuckDbRoleAdapter> {
    void params;
    return new DuckDbRoleAdapter();
  }
}
