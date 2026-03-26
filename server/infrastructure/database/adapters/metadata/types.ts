import { DatabaseClientType } from '~/core/constants/database-client-type';
import type {
  SchemaMetaData,
  DatabaseMetadata,
  ReservedTableSchemas,
} from '~/core/types';
import type { BaseDatabaseAdapterParams } from '../shared';

export type DatabaseMetadataAdapterParams = BaseDatabaseAdapterParams;

export interface IDatabaseMetadataAdapter {
  readonly dbType: DatabaseClientType;

  getSchemaMetaData(): Promise<SchemaMetaData[]>;
  getErdData(): Promise<DatabaseMetadata>;
  getReverseSchemas(): Promise<ReservedTableSchemas[]>;
}
