import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { DatabaseMetadata, SchemaMetaData } from '~/core/types';
import {
  normalizeDetails,
  PostgresMetadataAdapter,
} from '../postgres/postgres-metadata.adapter';
import { getPgCompatibleErdDataQuery } from '../shared/pg-compatible-erd-data.query';
import { getPgCompatibleSchemaMetaDataQuery } from '../shared/pg-compatible-schema-metadata.query';
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

  // CockroachDB exposes extra internal virtual schemas (crdb_internal,
  // pg_extension) that the inherited Postgres query's schema filters don't
  // account for — iterating over them throws "null value not allowed for
  // object key" on CockroachDB v24.2.
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

  // CockroachDB has no pg_relation_size() and has the same schema-pollution
  // issue as getSchemaMetaData above. Verified against CockroachDB v24.2.
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
