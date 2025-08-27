export interface MappedRawColumn {
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  queryFieldName: string; // use this for display field name
  originalName: string; // use this for update statement or delete statement
  canMutate?: boolean;
  ordinal_position?: number | undefined;
  type?: string | undefined;
  short_type_name?: string | undefined;
  tableName: string;
}
