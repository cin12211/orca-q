import { DatabaseClientType } from '~/core/constants/database-client-type';
import type {
  SchemaMetaData,
  DatabaseMetadata,
  ReservedTableSchemas,
} from '~/core/types';
import { BaseDomainAdapter } from '../../shared';
import { resolveMetadataTypeAlias } from '../type-alias.constants';
import type {
  IDatabaseMetadataAdapter,
  DatabaseMetadataAdapterParams,
  SchemaMetadataQueryOptions,
} from '../types';
import {
  buildSchemaMetaDataQuery,
  getSchemaNamesQuery,
  getErdDataQuery,
  getReverseSchemasQuery,
} from './constants';

const normalizeSchemaColumns = <
  TColumn extends {
    type: string;
    raw_type_name?: string;
    short_type_name?: string;
  },
>(
  columns: TColumn[] | undefined,
  dbType: DatabaseClientType
) =>
  (columns || []).map(column => {
    const rawType = column.raw_type_name || column.type;

    return {
      ...column,
      raw_type_name: rawType,
      short_type_name: resolveMetadataTypeAlias(dbType, rawType),
    };
  });

export const normalizeDetails = <
  TDetails extends Record<
    string,
    {
      columns: Array<{
        type: string;
        raw_type_name?: string;
        short_type_name?: string;
      }>;
    }
  >,
>(
  details: TDetails | null | undefined,
  dbType: DatabaseClientType = DatabaseClientType.POSTGRES
) => {
  if (!details) {
    return details ?? null;
  }

  return Object.fromEntries(
    Object.entries(details).map(([name, detail]) => [
      name,
      {
        ...detail,
        columns: normalizeSchemaColumns(detail.columns, dbType),
      },
    ])
  ) as TDetails;
};

export interface PostgresMetadataQueries {
  schemaNames: string;
  buildSchemaMetaData(schemaName?: string): string;
  erdData: string;
  reverseSchemas: string;
}

const POSTGRES_METADATA_QUERIES: PostgresMetadataQueries = {
  schemaNames: getSchemaNamesQuery,
  buildSchemaMetaData: buildSchemaMetaDataQuery,
  erdData: getErdDataQuery,
  reverseSchemas: getReverseSchemasQuery,
};

export class PostgresMetadataAdapter
  extends BaseDomainAdapter
  implements IDatabaseMetadataAdapter
{
  readonly dbType: DatabaseClientType = DatabaseClientType.POSTGRES;

  /** Catalog queries; Postgres-compatible engines swap in their own. */
  protected readonly queries: PostgresMetadataQueries =
    POSTGRES_METADATA_QUERIES;

  static async create(
    params: DatabaseMetadataAdapterParams
  ): Promise<PostgresMetadataAdapter> {
    const adapter = await PostgresMetadataAdapter.resolveAdapter(
      params,
      DatabaseClientType.POSTGRES
    );
    return new PostgresMetadataAdapter(adapter);
  }

  async getSchemaMetaData(
    options?: SchemaMetadataQueryOptions
  ): Promise<SchemaMetaData[]> {
    if (options?.namesOnly) {
      const names = await this.adapter.rawQuery<{
        name: string;
        is_system: boolean;
      }>(this.queries.schemaNames, []);

      return names.map(({ name, is_system }) => ({
        name,
        is_system,
        tables: null,
        views: null,
        functions: null,
        table_details: null,
        view_details: null,
      }));
    }

    const query = this.queries.buildSchemaMetaData(options?.schemaName);
    const bindings = options?.schemaName ? [options.schemaName] : [];

    const metadata = await this.adapter.rawQuery<SchemaMetaData>(
      query,
      bindings
    );

    return this.normalizeSchemaMetadata(metadata);
  }

  protected normalizeSchemaMetadata(
    metadata: SchemaMetaData[]
  ): SchemaMetaData[] {
    return metadata.map(schema => ({
      ...schema,
      table_details: normalizeDetails(schema.table_details, this.dbType),
      view_details: normalizeDetails(schema.view_details, this.dbType),
    }));
  }

  async getErdData(): Promise<DatabaseMetadata> {
    const result = await this.adapter.rawQuery(this.queries.erdData);
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

  async getReverseSchemas(): Promise<ReservedTableSchemas[]> {
    const result = await this.adapter.rawQuery(this.queries.reverseSchemas);
    return result[0]?.tables || [];
  }
}
