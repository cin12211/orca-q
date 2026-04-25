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

export interface IDatabaseMetadataAdapter {
  readonly dbType: DatabaseClientType;

  getSchemaMetaData(): Promise<SchemaMetaData[]>;
  getErdData(): Promise<DatabaseMetadata>;
  getReverseSchemas(): Promise<ReservedTableSchemas[]>;
}
