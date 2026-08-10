import { DatabaseClientType } from '~/core/constants/database-client-type';
import { PostgresMetadataAdapter } from '../postgres/postgres-metadata.adapter';
import type { DatabaseMetadataAdapterParams } from '../types';

export class CockroachMetadataAdapter extends PostgresMetadataAdapter {
  override readonly dbType = DatabaseClientType.COCKROACHDB;

  static override async create(
    params: DatabaseMetadataAdapterParams
  ): Promise<CockroachMetadataAdapter> {
    const adapter = await CockroachMetadataAdapter.resolveAdapter(
      params,
      DatabaseClientType.COCKROACHDB
    );
    return new CockroachMetadataAdapter(adapter);
  }
}
