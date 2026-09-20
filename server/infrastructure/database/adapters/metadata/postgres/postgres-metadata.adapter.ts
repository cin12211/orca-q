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
  columns: TColumn[] | undefined
) =>
  (columns || []).map(column => {
    const rawType = column.raw_type_name || column.type;

    return {
      ...column,
      raw_type_name: rawType,
      short_type_name: resolveMetadataTypeAlias(
        DatabaseClientType.POSTGRES,
        rawType
      ),
    };
  });

const normalizeDetails = <
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
  details: TDetails | null | undefined
) => {
  if (!details) {
    return details ?? null;
  }

  return Object.fromEntries(
    Object.entries(details).map(([name, detail]) => [
      name,
      {
        ...detail,
        columns: normalizeSchemaColumns(detail.columns),
      },
    ])
  ) as TDetails;
};

export class PostgresMetadataAdapter
  extends BaseDomainAdapter
  implements IDatabaseMetadataAdapter
{
  readonly dbType = DatabaseClientType.POSTGRES;

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
      }>(getSchemaNamesQuery, []);

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

    const query = buildSchemaMetaDataQuery(options?.schemaName);
    const bindings = options?.schemaName ? [options.schemaName] : [];

    const metadata = await this.adapter.rawQuery<SchemaMetaData>(
      query,
      bindings
    );

    return metadata.map(schema => ({
      ...schema,
      table_details: normalizeDetails(schema.table_details),
      view_details: normalizeDetails(schema.view_details),
    }));
  }

  async getErdData(): Promise<DatabaseMetadata> {
    const result = await this.adapter.rawQuery(getErdDataQuery);
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
    const result = await this.adapter.rawQuery(getReverseSchemasQuery);
    return result[0]?.tables || [];
  }
}
