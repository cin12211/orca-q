import { DatabaseClientType } from '~/core/constants/database-client-type';
import { PostgresMetadataAdapter } from '../postgres/postgres-metadata.adapter';
import type { DatabaseMetadataAdapterParams } from '../types';

export class RedshiftMetadataAdapter extends PostgresMetadataAdapter {
  override readonly dbType = DatabaseClientType.REDSHIFT;

  static override async create(
    params: DatabaseMetadataAdapterParams
  ): Promise<RedshiftMetadataAdapter> {
    const adapter = await RedshiftMetadataAdapter.resolveAdapter(
      params,
      DatabaseClientType.REDSHIFT
    );
    return new RedshiftMetadataAdapter(adapter);
  }
}
