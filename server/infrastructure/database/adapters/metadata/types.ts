import type {
  SchemaMetaData,
  DatabaseMetadata,
  ReservedTableSchemas,
} from '~/core/types';
import type {
  BaseDatabaseAdapterParams,
  SupportedDatabaseType,
} from '../shared';

export type DatabaseMetadataAdapterParams = BaseDatabaseAdapterParams;

export interface IDatabaseMetadataAdapter {
  readonly dbType: SupportedDatabaseType;

  getSchemaMetaData(): Promise<SchemaMetaData[]>;
  getErdData(): Promise<DatabaseMetadata>;
  getReverseSchemas(): Promise<ReservedTableSchemas[]>;
}
