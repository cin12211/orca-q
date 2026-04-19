// SQLite row type definitions for Electron persist layer.
// These use snake_case column names, integer booleans, and JSON strings —
// matching the raw SQLite row format. Separate from the TypeScript entity
// interfaces in core/types/entities/ which use camelCase.

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
}

export interface AppConfigRow {
  id: string; // always 'app-config'
  data: string; // JSON blob
}

export interface AgentStateRow {
  id: string; // always 'agent-state'
  data: string; // JSON blob
}

export interface QueryBuilderStateRow {
  id: string;
  workspace_id: string;
  connection_id: string;
  schema_name: string;
  table_name: string;
  filters: string; // JSON array
  pagination: string; // JSON object
  order_by: string; // JSON object
  is_show_filters: number; // 0 = false, 1 = true
  compose_with: string;
  updated_at: string;
}

export interface SchemaVersionRow {
  table_name: string;
  version: number;
  applied_at: string;
}
