import { DatabaseClientType } from '~/core/constants/database-client-type';
import { PostgresViewAdapter } from '../postgres/postgres-view.adapter';
import type { DatabaseViewAdapterParams } from '../types';

export class CockroachViewAdapter extends PostgresViewAdapter {
  override readonly dbType = DatabaseClientType.COCKROACHDB;

  static override async create(
    params: DatabaseViewAdapterParams
  ): Promise<CockroachViewAdapter> {
    const adapter = await CockroachViewAdapter.resolveAdapter(
      params,
      DatabaseClientType.COCKROACHDB
    );
    return new CockroachViewAdapter(adapter);
  }
}
