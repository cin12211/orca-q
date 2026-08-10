import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { DatabaseMetadata, SchemaMetaData } from '~/core/types';
import {
  normalizeDetails,
  PostgresMetadataAdapter,
} from '../postgres/postgres-metadata.adapter';
import { getPgCompatibleErdDataQuery } from '../shared/pg-compatible-erd-data.query';
import { getPgCompatibleSchemaMetaDataQuery } from '../shared/pg-compatible-schema-metadata.query';
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

  override async getSchemaMetaData(): Promise<SchemaMetaData[]> {
    const metadata = await this.adapter.rawQuery<SchemaMetaData>(
      getPgCompatibleSchemaMetaDataQuery,
      []
    );

    return metadata.map(schema => ({
      ...schema,
      table_details: normalizeDetails(schema.table_details),
      view_details: normalizeDetails(schema.view_details),
    }));
  }

  // Redshift has no pg_relation_size(); the inherited Postgres ERD query
  // uses it purely for a decorative index-size field.
  override async getErdData(): Promise<DatabaseMetadata> {
    const result = await this.adapter.rawQuery(getPgCompatibleErdDataQuery);
    return (
      result[0]?.metadata || {
        tables: [],
        views: [],
        databaseName: '',
        version: '',
        config: [],
      }
    );
  }
}
