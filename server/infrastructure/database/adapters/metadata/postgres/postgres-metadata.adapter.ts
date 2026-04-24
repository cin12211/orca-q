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
} from '../types';
import {
  getSchemaMetaDataQuery,
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

  async getSchemaMetaData(): Promise<SchemaMetaData[]> {
    const metadata = await this.adapter.rawQuery<SchemaMetaData>(
      getSchemaMetaDataQuery,
      []
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
