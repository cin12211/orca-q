import type { SchemaForeignKeyMetadata } from './database-schemas.types';

export interface MappedRawColumn {
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  queryFieldName: string;
  originalName: string;
  aliasFieldName: string;
  canMutate?: boolean;
  ordinal_position?: number | undefined;
  type?: string | undefined;
  short_type_name?: string | undefined;
  tableName: string;
  schemaName?: string | undefined;
  sourceColumnName?: string | undefined;
  foreignKey?: SchemaForeignKeyMetadata | undefined;
}
