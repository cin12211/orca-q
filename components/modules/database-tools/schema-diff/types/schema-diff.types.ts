import type { ISSLConfig, ISSHConfig } from '~/components/modules/connection';
import type { DatabaseClientType } from '~/core/constants/database-client-type';
import type {
  SchemaColumnMetadata,
  SchemaForeignKeyMetadata,
} from '~/core/types';

// ─── Status ────────────────────────────────────────────────────────────────────

export type DiffStatus = 'added' | 'removed' | 'modified' | 'unchanged';

// ─── Request ───────────────────────────────────────────────────────────────────

export interface ConnectionParams {
  type: DatabaseClientType;
  connectionString?: string;
  host?: string;
  port?: string;
  username?: string;
  password?: string;
  database?: string;
  ssl?: ISSLConfig;
  ssh?: ISSHConfig;
}

export interface SchemaDiffRequest {
  source: ConnectionParams;
  target: ConnectionParams;
  safeMode?: boolean;
}

// ─── Diff units ────────────────────────────────────────────────────────────────

export interface ColumnDiff {
  name: string;
  status: DiffStatus;
  source?: SchemaColumnMetadata;
  target?: SchemaColumnMetadata;
  changes?: Record<string, { from: unknown; to: unknown }>;
}

export interface ForeignKeyDiff {
  key: string;
  status: DiffStatus;
  source?: SchemaForeignKeyMetadata;
  target?: SchemaForeignKeyMetadata;
}

export interface TableDiff {
  name: string;
  schema: string;
  status: DiffStatus;
  columns: ColumnDiff[];
  foreignKeys: ForeignKeyDiff[];
}

export interface ViewDiff {
  name: string;
  schema: string;
  status: DiffStatus;
}

export interface FunctionDiff {
  name: string;
  signature: string;
  schema: string;
  status: DiffStatus;
}

// ─── SQL ───────────────────────────────────────────────────────────────────────

export interface SQLStatement {
  type:
    | 'CREATE_TABLE'
    | 'DROP_TABLE'
    | 'ADD_COLUMN'
    | 'DROP_COLUMN'
    | 'MODIFY_COLUMN';
  destructive: boolean;
  sql: string;
  description: string;
}

export interface GeneratedSQL {
  safe: string;
  full: string;
  statements: SQLStatement[];
}

// ─── Response ──────────────────────────────────────────────────────────────────

export interface DiffSummary {
  added: number;
  removed: number;
  modified: number;
  unchanged: number;
}

export interface SchemaGroupDiff {
  name: string;
  tables: TableDiff[];
  views: ViewDiff[];
  functions: FunctionDiff[];
}

export interface SchemaDiffResponse {
  schemas: SchemaGroupDiff[];
  summary: DiffSummary;
  sql: GeneratedSQL;
}
