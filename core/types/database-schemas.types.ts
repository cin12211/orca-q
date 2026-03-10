import { type FunctionSchemaEnum, type ViewSchemaEnum } from '~/core/types';

export interface SchemaColumnMetadata {
  name: string;
  ordinal_position: number;
  type: string;
  short_type_name: string;
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
  tables: string[] | null;
  views: ViewSchema[] | null;
  functions: FunctionSchema[] | null;
  table_details: TableDetails | null;
  view_details: ViewDetails | null;
}
