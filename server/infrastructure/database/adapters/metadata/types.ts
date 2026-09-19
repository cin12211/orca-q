import { DatabaseClientType } from '~/core/constants/database-client-type';
import type {
  SchemaMetaData,
  DatabaseMetadata,
  ReservedTableSchemas,
} from '~/core/types';
import type { BaseDatabaseAdapterParams } from '../shared';

export type {
  MetadataTypeAliasDatabaseFamily,
  MetadataTypeAliasMatchKind,
  MetadataTypeAliasRule,
} from './type-alias.constants';

export type DatabaseMetadataAdapterParams = BaseDatabaseAdapterParams;

export interface SchemaMetadataQueryOptions {
  /**
   * When true, only schema names are fetched (no tables/views/functions/
   * details). Used to populate the Schemas sidebar quickly at connect time.
   */
  namesOnly?: boolean;
  /**
   * When set (and `namesOnly` is not), scope the full metadata query to a
   * single schema instead of every schema on the connection.
   */
  schemaName?: string;
}

export interface IDatabaseMetadataAdapter {
  readonly dbType: DatabaseClientType;

  getSchemaMetaData(
    options?: SchemaMetadataQueryOptions
  ): Promise<SchemaMetaData[]>;
  getErdData(): Promise<DatabaseMetadata>;
  getReverseSchemas(): Promise<ReservedTableSchemas[]>;
}
