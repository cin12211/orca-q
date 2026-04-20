/**
 * SQLite row type definitions for the Electron persist layer.
 *
 * ── Purpose ──────────────────────────────────────────────────────────────────
 * These interfaces describe the RAW SQLite row format — they are NOT the same
 * as the domain entity types in core/types/entities/. They exist to give
 * `fromRow()` methods inside each electron/persist/entities/*.ts file proper
 * type-safe casts instead of bare `as string | null` everywhere.
 *
 * Key differences vs. core/types/entities/:
 *   - Column names: snake_case  (entities use camelCase)
 *   - Booleans:     number (0/1) (entities use boolean)
 *   - Optionals:    string | null (SQL NULL) vs. string | undefined (TS)
 *   - Nested types: string (JSON.stringify'd blob) vs. proper nested interface
 *
 * ── 4-File Sync Rule ─────────────────────────────────────────────────────────
 * When adding or renaming a field, update ALL FOUR places in this order:
 *   1. core/types/entities/<entity>.entity.ts     — camelCase TS type
 *   2. electron/persist/schema.ts                 — snake_case row type (HERE)
 *   3. electron/persist/entities/<Entity>SQLiteStorage.ts — toRow() + fromRow()
 *   4. electron/persist/migration/versions/v001-initial-schema.ts — DDL
 *
 * Example — adding `color?: string` to Workspace:
 *   1. workspace.entity.ts     → add `color?: string`
 *   2. schema.ts WorkspaceRow  → add `color: string | null`
 *   3. WorkspaceSQLiteStorage  → toRow: `color: w.color ?? null`
 *                                fromRow: `color: r.color ?? undefined`
 *   4. v001-initial-schema.ts  → `color TEXT` column in workspaces DDL
 *
 * ── Column Alignment Audit ───────────────────────────────────────────────────
 * Verified against v001-initial-schema.ts on 2026-04-19.
 * All 11 tables aligned. Re-audit after any DDL change.
 */

export interface WorkspaceRow {
  id: string;
  icon: string;
  name: string;
  desc: string | null;
  last_opened: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface ConnectionRow {
  id: string;
  workspace_id: string;
  name: string;
  type: string;
  method: string;
  connection_string: string | null;
  host: string | null;
  port: string | null;
  username: string | null;
  password: string | null;
  database_name: string | null;
  ssl_config: string | null; // JSON string
  ssh_config: string | null; // JSON string
  tag_ids: string | null; // JSON array string
  created_at: string;
  updated_at: string | null;
}

export interface WorkspaceStateRow {
  id: string; // = workspaceId
  connection_id: string | null;
  connection_states: string | null; // JSON array string
  opened_at: string | null;
  updated_at: string | null;
}

export interface TabViewRow {
  id: string;
  workspace_id: string;
  connection_id: string;
  schema_id: string;
  tab_index: number;
  name: string;
  icon: string;
  icon_class: string | null;
  type: string;
  route_name: string;
  route_params: string | null; // JSON object string
  metadata: string | null; // JSON object string
}

export interface QuickQueryLogRow {
  id: string;
  connection_id: string;
  workspace_id: string;
  schema_name: string;
  table_name: string;
  logs: string;
  query_time: number;
  error: string | null; // JSON object string
  error_message: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface RowQueryFileRow {
  id: string;
  workspace_id: string;
  parent_id: string | null;
  title: string;
  type: 'file' | 'folder';
  created_at: string;
  updated_at: string | null;
}

export interface RowQueryFileContentRow {
  id: string; // references row_query_files(id) ON DELETE CASCADE
  contents: string;
}

export interface EnvironmentTagRow {
  id: string;
  name: string;
  color: string;
  strict_mode: number; // 0 = false, 1 = true
  is_system: number; // 0 = false, 1 = true
  created_at: string;
  updated_at: string | null;
  // NOTE: No workspace_id column. The field was removed from the environment_tags
  // DDL as part of the 021-standardize-storage-layer refactor. EnvironmentTags
  // are now global (not scoped to a workspace).
}

export interface AppConfigRow {
  id: string; // always 'app-config'
  data: string; // JSON blob
}

export interface AgentStateRow {
  id: string; // always 'agent-state'
  data: string; // JSON blob
}

export interface SchemaVersionRow {
  table_name: string;
  version: number;
  applied_at: string;
}

/**
 * Row type for the `migration_state` table (v001 DDL).
 * The table stores a single record whose `data` field is a JSON array of
 * applied migration names. MigrationStateSQLiteStorage serialises/deserialises
 * this JSON without referencing this interface directly (uses duck-typed row
 * access), but the interface is kept here for parity and future migration code.
 */
export interface MigrationStateRow {
  id: string; // always 'applied-migrations'
  data: string; // JSON array of migration name strings
}

/**
 * ── Column Alignment Audit (v001-initial-schema.ts) ─────────────────────────
 * Verified 2026-04-20 | All 10 v001 tables + 1 runner.ts internal table.
 *
 *  Table                   Row interface           Status
 *  ──────────────────────  ──────────────────────  ──────
 *  workspaces              WorkspaceRow            ✅ aligned
 *  connections             ConnectionRow           ✅ aligned
 *  workspace_states        WorkspaceStateRow       ✅ aligned
 *  tab_views               TabViewRow              ✅ aligned
 *  quick_query_logs        QuickQueryLogRow        ✅ aligned
 *  row_query_files         RowQueryFileRow         ✅ aligned
 *  row_query_file_contents RowQueryFileContentRow  ✅ aligned
 *  environment_tags        EnvironmentTagRow       ✅ aligned (no workspace_id — removed in 021)
 *  app_config              AppConfigRow            ✅ aligned
 *  agent_state             AgentStateRow           ✅ aligned
 *  migration_state         MigrationStateRow       ✅ aligned (added to schema.ts 2026-04-19)
 *  _schema_versions        SchemaVersionRow        ✅ aligned (created by runner.ts, not v001)
 */
