import { DatabaseClientType } from '~/core/constants/database-client-type';
import type {
  SchemaMetaData,
  DatabaseMetadata,
  ReservedTableSchemas,
} from '~/core/types';
import { BaseDomainAdapter } from '../../shared';
import type {
  IDatabaseMetadataAdapter,
  DatabaseMetadataAdapterParams,
} from '../types';
import {
  getSchemaMetaDataQuery,
  getErdDataQuery,
  getReverseSchemasQuery,
} from './constants';

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
    return await this.adapter.rawQuery(getSchemaMetaDataQuery, []);
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
