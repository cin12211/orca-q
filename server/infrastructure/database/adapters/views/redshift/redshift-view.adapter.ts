import { DatabaseClientType } from '~/core/constants/database-client-type';
import { PostgresViewAdapter } from '../postgres/postgres-view.adapter';
import type { DatabaseViewAdapterParams } from '../types';

export class RedshiftViewAdapter extends PostgresViewAdapter {
  override readonly dbType = DatabaseClientType.REDSHIFT;

  static override async create(
    params: DatabaseViewAdapterParams
  ): Promise<RedshiftViewAdapter> {
    const adapter = await RedshiftViewAdapter.resolveAdapter(
      params,
      DatabaseClientType.REDSHIFT
    );
    return new RedshiftViewAdapter(adapter);
  }
}
