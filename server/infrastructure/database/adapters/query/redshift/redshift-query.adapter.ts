import { DatabaseClientType } from '~/core/constants/database-client-type';
import { PostgresQueryAdapter } from '../postgres/postgres-query.adapter';
import type { DatabaseQueryAdapterParams } from '../types';

export class RedshiftQueryAdapter extends PostgresQueryAdapter {
  override readonly dbType = DatabaseClientType.REDSHIFT;

  static override async create(
    params: DatabaseQueryAdapterParams
  ): Promise<RedshiftQueryAdapter> {
    const adapter = await RedshiftQueryAdapter.resolveAdapter(
      params,
      DatabaseClientType.REDSHIFT
    );
    return new RedshiftQueryAdapter(adapter);
  }
}
