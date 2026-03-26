export interface TableOverviewMetadata {
  name: string;
  schema: string;
  kind: string;
  owner: string;
  estimated_row: number | null;
  total_size: string | null;
  data_size: string | null;
  index_size: string | null;
  comment: string | null;
}

export interface ColumnMetadata {
  name: string;
  ordinal_position: number;
  short_type_name?: string;
  type: string;
  character_maximum_length: number | null;
  precision: { precision: number; scale: number } | null;
  nullable: boolean;
  default: string | null;
  collation: string | null;
  comment: string | null;
}

export interface ForeignKeyMetadata {
  foreign_key_name: string;
  column: string;
  reference_schema: string;
  reference_table: string;
  reference_column: string;
  fk_def: string;
}

export interface PrimaryKeyMetadata {
  column: string;
  pk_def: string;
}

export interface IndexMetadata {
  index_name: string;
  column: string;
  index_type: string;
  index_size: number;
  is_unique: boolean;
  cardinality: number;
  column_position: number;
  direction: 'ASC' | 'DESC';
}

export interface TableMetadata {
  id: string; // = schema + '.' + table , example: "public.users"
  schema: string;
  table: string;
  rows: number;
  type: string;
  comment: string | null;
  columns: ColumnMetadata[];
  foreign_keys: ForeignKeyMetadata[];
  primary_keys: PrimaryKeyMetadata[];
  indexes: IndexMetadata[];
}

export interface ViewMetadata {
  schema: string;
  view_name: string;
  view_definition: string; // Base64-encoded
}

export interface ConfigMetadata {
  name: string;
  value: string;
}

export interface DatabaseMetadata {
  tables: TableMetadata[];
  views: ViewMetadata[];
  databaseName: string;
  version: string;
  config: ConfigMetadata[];
}

export interface TableStructure {
  column_name: string;
  data_type: string;
  is_nullable: 'YES' | 'NO';
  default_value: string | null;
  foreign_keys: string; // example: " -> other_table(column)"
  column_comment: string;
  on_update?: string;
  on_delete?: string;
}

export interface TableSize {
  tableSize: string;
  dataSize: string;
  indexSize: string;
}

export interface TableMeta {
  type: string;
  owner: string;
  rowEstimate?: number;
  totalSize?: string;
  tableSize?: string;
  indexSize?: string;
}

export interface ReservedTableSchemas {
  schema: string;
  table: string;
  rows: number;
  type: string;
  primary_keys: {
    column: string;
  }[];
  used_by: {
    referencing_schema: string;
    referencing_table: string;
    foreign_key_name: string;
    fk_column: string;
    referenced_column: string;
  }[];
}

export interface BulkUpdateResponse {
  success: boolean;
  data?: {
    query: string;
    affectedRows: number;
    results: Record<string, unknown>[];
  }[];
  error?: string;
  queryTime: number;
}

// --- Table Advanced Objects (View Only) ---

export interface TableIndex {
  indexName: string;
  isUnique: boolean;
  isPrimary: boolean;
  method: string;
  definition: string;
}

export interface RLSPolicy {
  policyName: string;
  permissive: string;
  command: string;
  roles: string[];
  usingExpression: string | null;
  withCheckExpression: string | null;
}

export interface RLSStatus {
  enabled: boolean;
}

export interface TableRule {
  ruleName: string;
  event: string;
  actionType: string;
  definition: string;
}

export interface TableTrigger {
  triggerName: string;
  enabled: boolean;
  timing: string;
  events: string[];
  orientation: string;
  definition: string;
}
