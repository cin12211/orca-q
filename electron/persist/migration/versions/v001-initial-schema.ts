import type Database from 'better-sqlite3';

export function up(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id          TEXT PRIMARY KEY,
      icon        TEXT NOT NULL,
      name        TEXT NOT NULL,
      desc        TEXT,
      last_opened TEXT,
      created_at  TEXT NOT NULL,
      updated_at  TEXT
    );

    CREATE TABLE IF NOT EXISTS connections (
      id                TEXT PRIMARY KEY,
      workspace_id      TEXT NOT NULL REFERENCES workspaces(id),
      name              TEXT NOT NULL,
      type              TEXT NOT NULL,
      method            TEXT NOT NULL,
      connection_string TEXT,
      host              TEXT,
      port              TEXT,
      username          TEXT,
      password          TEXT,
      database_name     TEXT,
      ssl_config        TEXT,
      ssh_config        TEXT,
      tag_ids           TEXT,
      created_at        TEXT NOT NULL,
      updated_at        TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_connections_workspace ON connections(workspace_id);

    CREATE TABLE IF NOT EXISTS workspace_states (
      id                TEXT PRIMARY KEY,
      connection_id     TEXT,
      connection_states TEXT,
      opened_at         TEXT,
      updated_at        TEXT
    );

    CREATE TABLE IF NOT EXISTS tab_views (
      id            TEXT PRIMARY KEY,
      workspace_id  TEXT NOT NULL REFERENCES workspaces(id),
      connection_id TEXT NOT NULL,
      schema_id     TEXT NOT NULL,
      tab_index     INTEGER NOT NULL,
      name          TEXT NOT NULL,
      icon          TEXT NOT NULL,
      icon_class    TEXT,
      type          TEXT NOT NULL,
      route_name    TEXT NOT NULL,
      route_params  TEXT,
      metadata      TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_tab_views_ctx ON tab_views(workspace_id, connection_id);

    CREATE TABLE IF NOT EXISTS quick_query_logs (
      id            TEXT PRIMARY KEY,
      connection_id TEXT NOT NULL,
      workspace_id  TEXT NOT NULL,
      schema_name   TEXT NOT NULL,
      table_name    TEXT NOT NULL,
      logs          TEXT NOT NULL,
      query_time    REAL NOT NULL,
      error         TEXT,
      error_message TEXT,
      created_at    TEXT NOT NULL,
      updated_at    TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_qlogs_conn ON quick_query_logs(connection_id);

    CREATE TABLE IF NOT EXISTS row_query_files (
      id           TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      parent_id    TEXT,
      title        TEXT NOT NULL,
      type         TEXT NOT NULL CHECK(type IN ('file','folder')),
      created_at   TEXT NOT NULL,
      updated_at   TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_rqf_workspace ON row_query_files(workspace_id);

    CREATE TABLE IF NOT EXISTS row_query_file_contents (
      id       TEXT PRIMARY KEY REFERENCES row_query_files(id) ON DELETE CASCADE,
      contents TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS environment_tags (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      color        TEXT NOT NULL,
      strict_mode  INTEGER NOT NULL DEFAULT 0,
      is_system    INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT NOT NULL,
      updated_at   TEXT
    );

    CREATE TABLE IF NOT EXISTS app_config (
      id   TEXT PRIMARY KEY,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agent_state (
      id   TEXT PRIMARY KEY,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS query_builder_states (
      id              TEXT PRIMARY KEY,
      workspace_id    TEXT NOT NULL,
      connection_id   TEXT NOT NULL,
      schema_name     TEXT NOT NULL,
      table_name      TEXT NOT NULL,
      filters         TEXT NOT NULL,
      pagination      TEXT NOT NULL,
      order_by        TEXT NOT NULL,
      is_show_filters INTEGER NOT NULL DEFAULT 0,
      compose_with    TEXT NOT NULL,
      updated_at      TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_qbs_ctx ON query_builder_states(workspace_id, connection_id);

    CREATE TABLE IF NOT EXISTS migration_state (
      id   TEXT PRIMARY KEY,
      data TEXT NOT NULL
    );
  `);
}
