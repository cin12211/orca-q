import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { SchemaMetaData } from '~/core/types';
import {
  PostgresMetadataAdapter,
  type PostgresMetadataQueries,
} from '../postgres/postgres-metadata.adapter';
import type { DatabaseMetadataAdapterParams } from '../types';
import {
  buildSchemaMetaDataQuery,
  getErdDataQuery,
  getReverseSchemasQuery,
  getSchemaNamesQuery,
} from './constants';

const COCKROACH_METADATA_QUERIES: PostgresMetadataQueries = {
  schemaNames: getSchemaNamesQuery,
  buildSchemaMetaData: buildSchemaMetaDataQuery,
  erdData: getErdDataQuery,
  reverseSchemas: getReverseSchemasQuery,
};

type DetailPairs = Array<[string, unknown]>;

// The CockroachDB query returns `[name, details]` pairs instead of a JSON
// object (see schema-metadata.query.ts); rebuild the object shape here.
const pairsToObject = <T>(value: unknown): T | null => {
  if (!Array.isArray(value)) {
    return (value as T) ?? null;
  }

  return Object.fromEntries(value as DetailPairs) as T;
};

export class CockroachMetadataAdapter extends PostgresMetadataAdapter {
  override readonly dbType: DatabaseClientType = DatabaseClientType.COCKROACHDB;

  protected override readonly queries = COCKROACH_METADATA_QUERIES;

  static override async create(
    params: DatabaseMetadataAdapterParams
  ): Promise<CockroachMetadataAdapter> {
    const adapter = await CockroachMetadataAdapter.resolveAdapter(
      params,
      DatabaseClientType.COCKROACHDB
    );
    return new CockroachMetadataAdapter(adapter);
  }

  protected override normalizeSchemaMetadata(
    metadata: SchemaMetaData[]
  ): SchemaMetaData[] {
    return super.normalizeSchemaMetadata(
      metadata.map(schema => ({
        ...schema,
        table_details: pairsToObject<SchemaMetaData['table_details']>(
          schema.table_details
        ),
        view_details: pairsToObject<SchemaMetaData['view_details']>(
          schema.view_details
        ),
      }))
    );
  }
}
