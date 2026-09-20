import type { DatabaseClientType } from '~/core/constants/database-client-type';
import { type FunctionSchemaEnum, type ViewSchemaEnum } from '~/core/types';
import type {
  EConnectionProviderKind,
  IManagedSqliteConfig,
  ISSLConfig,
  ISSHConfig,
} from '~/core/types/entities/connection.entity';

export interface DatabaseMetadataRequestParams {
  dbConnectionString?: string;
  host?: string;
  port?: string;
  username?: string;
  password?: string;
  database?: string;
  serviceName?: string;
  filePath?: string;
  type?: DatabaseClientType;
  providerKind?: EConnectionProviderKind;
  managedSqlite?: IManagedSqliteConfig;
  ssl?: ISSLConfig;
  ssh?: ISSHConfig;
  /**
   * When true, skip fetching tables/views/functions/details and return only
   * lightweight schema names. Used to populate the Schemas sidebar quickly
   * at connect time.
   */
  namesOnly?: boolean;
  /**
   * When set (and `namesOnly` is not), scope the full metadata fetch to a
   * single schema instead of every schema on the connection. Used for the
   * lazy per-schema detail load triggered when a user selects a schema.
   */
  schemaName?: string;
}

export interface SchemaColumnMetadata {
  name: string;
  ordinal_position: number;
  type: string;
  short_type_name: string;
  raw_type_name?: string;
  is_nullable: boolean;
  default_value: string | null;
}

export interface SchemaForeignKeyMetadata {
  column: string;
  referenced_column: string;
  referenced_table: string;
  referenced_table_schema: string;
}

export interface SchemaPrimaryKey {
  column: string;
}

export interface TableDetailMetadata {
  columns: SchemaColumnMetadata[];
  foreign_keys: SchemaForeignKeyMetadata[];
  primary_keys: SchemaPrimaryKey[];
  table_id: string;
}

export interface ViewDetailMetadata {
  columns: SchemaColumnMetadata[];
  view_id: string;
  type: ViewSchemaEnum;
}

export interface TableDetails {
  [tableName: string]: TableDetailMetadata;
}

export interface ViewDetails {
  [tableName: string]: ViewDetailMetadata;
}

export interface FunctionSchema {
  oId: string;
  name: string;
  type: FunctionSchemaEnum;
  parameters: string;
}

export interface ViewSchema {
  name: string;
  type: ViewSchemaEnum;
  oid: string;
}

export interface SchemaMetaData {
  name: string;
  /** True for built-in system schemas (e.g. pg_catalog); set by names-only fetches. */
  is_system?: boolean;
  tables: string[] | null;
  views: ViewSchema[] | null;
  functions: FunctionSchema[] | null;
  table_details: TableDetails | null;
  view_details: ViewDetails | null;
}

export interface Schema {
  id: string;
  connectionId: string;
  workspaceId: string;
  name: string;
  /** Built-in system schema; shown under a "System" group in the selector. */
  isSystem?: boolean;
  tableDetails?: TableDetails | null;
  tables: string[];
  views: ViewSchema[];
  viewDetails?: ViewDetails | null;
  functions: FunctionSchema[];
}
