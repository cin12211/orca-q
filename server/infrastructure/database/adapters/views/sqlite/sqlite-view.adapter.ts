import { DatabaseClientType } from '~/core/constants/database-client-type';
import { BaseUnsupportedViewAdapter } from '../shared/base-unsupported-view.adapter';
import type { DatabaseViewAdapterParams } from '../types';

export class SqliteViewAdapter extends BaseUnsupportedViewAdapter {
  readonly dbType = DatabaseClientType.SQLITE3;

  static async create(
    params: DatabaseViewAdapterParams
  ): Promise<SqliteViewAdapter> {
    void params;
    return new SqliteViewAdapter();
  }
}
