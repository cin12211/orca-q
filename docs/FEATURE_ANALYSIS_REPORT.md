# OrcaQ — Complete Feature Analysis Report

> **Generated:** April 27, 2026  
> **Method:** Source code reverse-engineering (not documentation)  
> **Scope:** Full codebase — Electron main, Nuxt/Vue renderer, server infrastructure, stores, IPC layer

---

## 🧭 Product Overview

| Field | Detail |
|---|---|
| **Product Name** | OrcaQ ("Next Generation database editor") |
| **Type** | Cross-platform Desktop App (Electron) + Web SPA (Nuxt) |
| **Homepage** | https://orca-q.com |
| **Version** | 1.1.1 (MIT License) |
| **Architecture** | Modular monolith — SPA renderer (Nuxt/Vue 3) embedded in Electron shell, with a Nuxt server-side API layer for DB operations |
| **Render Mode** | SPA (`ssr: false`), hash-router in Electron, history-mode in web |
| **State Management** | Pinia (no store persistence — all persistence delegated to NeDB / IndexedDB via IPC bridge) |

### Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | Nuxt 3.16 + Vue 3.5 + TypeScript |
| Styling | Tailwind CSS 4 + shadcn-nuxt |
| Desktop Shell | Electron 35 |
| Code Editor | CodeMirror 6 (`@codemirror/lang-sql`, `@marimo-team/codemirror-sql`) |
| Data Grid | ag-grid-vue3 |
| AI SDK | Vercel AI SDK v5 (@ai-sdk/openai, anthropic, google, xai) |
| Diagrams | vue-flow (ERD), ECharts + vue-echarts (charts), Mermaid (inline markdown) |
| Forms | VeeValidate v4 + Zod |
| Drag & Drop | @atlaskit/pragmatic-drag-and-drop |
| DB Drivers | better-sqlite3, mysql2, oracledb, knex |
| Desktop Persistence | NeDB (Electron main via knex-managed SQLite) |
| Web Persistence | IndexedDB (polyfill with identical API surface) |
| Analytics | Amplitude Analytics Browser |

### Architecture Style

```
┌─────────────────────────────────────────────────────────────┐
│  Electron Shell (main.ts)                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Nuxt/Vue 3 SPA (renderer)                           │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │   │
│  │  │ Pinia    │  │ Vue UI   │  │ Nuxt Server API  │   │   │
│  │  │ Stores   │  │ Modules  │  │ (h3 event handler│   │   │
│  │  └──────────┘  └──────────┘  │  /api/*)         │   │   │
│  │                               └──────────────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  IPC Bridge (preload ↔ contextBridge)                │   │
│  │  workspaceApi | connectionApi | tabViewsApi | ...    │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  NeDB / knex-SQLite (userData.db, workspace.db, ...) │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Features

### 1. Workspace Management

**Description:** Top-level organizational unit. Users group related database connections under named workspaces with custom icons.

**Capabilities:**
- Create, rename, update, delete workspaces
- Custom icon per workspace
- Optional description field
- `lastOpened` timestamp tracked automatically
- List all workspaces on the home screen
- Navigate into a workspace to see its connections
- Delete workspace cascades to connections

**Tech Evidence:**
- Files: `core/stores/useWorkspacesStore.ts`, `components/modules/workspace/`
- Components: `Workspaces.vue`, `WorkspaceSelector.vue`
- Storage: `workspaceStorage` (NeDB `workspace.db` / IndexedDB)

---

### 2. Connection Management

**Description:** Define and manage database connection profiles within a workspace. Supports multiple database engines, connection methods, SSH tunnels, and SSL.

**Capabilities:**
- Create connections via **form fields** or **connection string**
- File-based connection for SQLite (`.db`, `.sqlite` files)
- Supported database types:
  - PostgreSQL, MySQL, MariaDB, SQLite3, MSSQL, Oracle
  - (enum also lists MongoDB, Redis, Snowflake — partially implemented)
- **SSH tunnel** support:
  - Password auth or private key auth
  - Optional keychain storage flag
- **SSL configuration**: disable / preferred / require / verify-ca / verify-full (with ca/cert/key)
- Connection health check (before saving)
- Edit existing connections
- Delete connections
- Tag connections with **Environment Tags**
- View connection list per workspace

**Tech Evidence:**
- Files: `core/types/entities/connection.entity.ts`, `components/modules/connection/`
- API: `server/api/managment-connection/health-check.ts`
- Components: `CreateConnectionModal.vue`, `ConnectionSSHTunnel.vue`, `ConnectionSSLConfig.vue`, `DatabaseTypeCard.vue`
- Store: `managementConnectionStore.ts`

---

### 3. Environment Tags

**Description:** Color-coded labels applied to connections to visually distinguish environments (dev, staging, production, etc.) with optional strict mode enforcement.

**Capabilities:**
- Create, rename, delete environment tags
- Assign a color from a predefined palette
- Enable **Strict Mode** per tag (triggers execution confirmation dialogs before running mutations)
- Assign multiple tags to a connection
- 5 built-in default tags seeded on first launch
- Tags visible on connection cards in the status bar

**Tech Evidence:**
- Files: `core/stores/useEnvironmentTagStore.ts`, `components/modules/environment-tag/`
- Constants: `DEFAULT_ENV_TAGS.ts`
- Settings panel: `SettingsComponentKey.EnvironmentTagsConfig`

---

### 4. Schema Explorer (Left Sidebar — Schemas Tab)

**Description:** Tree-based browser of the connected database schema. Provides a navigable hierarchy of tables, views, functions, and other objects.

**Capabilities:**
- Browse all schemas in the connected database
- Expand schemas → tables / views / functions / sequences
- Search / filter objects by name
- One-click navigation to open a table, view, or function in a new tab
- Right-click context menu:
  - Preview DDL (SQL definition)
  - Rename table (DDL operation with preview dialog)
  - Quick query a table
  - Open ERD for a table
- Collapse / expand entire tree
- Auto-refresh schema on reconnect
- Load session indicator (loading / completed / failed)
- Multi-schema support (schema selector dropdown)

**Tech Evidence:**
- Files: `components/modules/management/schemas/ManagementSchemas.vue`
- Hooks: `useSchemaTreeData.ts`, `useSchemaContextMenu.ts`
- Store: `useSchemaStore.ts`
- Dialogs: `RenameDialog.vue`, `SqlPreviewDialog.vue`

---

### 5. File Explorer (Left Sidebar — Explorer Tab)

**Description:** File-system-like explorer for organizing SQL query files into folders, similar to VS Code's Explorer panel.

**Capabilities:**
- Create new query files
- Create folders (unlimited nesting)
- Rename files and folders (inline edit)
- Delete files and folders
- Drag-and-drop file reordering and rearranging
- Search files by name
- Open files in the Raw Query editor (Code Query tab)
- Context menu (add file, add folder, rename, delete)
- Tree state persisted (expanded/collapsed nodes)

**Tech Evidence:**
- Files: `components/modules/management/explorer/ManagementExplorer.vue`
- Hooks: `useManagementExplorerTree.ts`
- Store: `useExplorerFileStore.ts`
- Base component: `components/base/tree-folder/FileTree.vue`

---

### 6. Quick Query — Table Data Browser

**Description:** Visual table data browser with inline editing, filtering, pagination, and structure inspection. The primary tool for day-to-day data exploration.

**Capabilities:**

**Data Viewing:**
- Display table rows in a high-performance ag-grid
- Pagination with configurable page size
- Column sorting (multi-column)
- Row selection (single/multi)
- Cell value formatter (types, NULL, JSON)
- Column type-aware display

**Filtering:**
- UI row filter builder (generates WHERE clauses)
- Autocomplete-aware column selector
- Filter guide popup
- View parser filter (for views with existing filters)

**Inline Editing:**
- Edit cell values inline
- Insert new rows
- Bulk delete selected rows
- Bulk update
- **Safe Mode**: shows generated SQL and prompts for confirmation before executing mutations
- Error popup with generated SQL on failure

**Structure / Metadata Tabs:**
- Column structure (names, types, PK, nullable, default)
- Table meta info (row count, size, created date)
- Indexes tab
- Triggers tab
- RLS (Row-Level Security) policies tab (PostgreSQL)
- Rules tab (PostgreSQL)

**Relations:**
- Related table preview (FK navigation — click a FK value to preview rows in related table)
- Breadcrumb navigation through FK relationships

**Extra:**
- Query history log panel (execution time, SQL, result)
- Table summary panel
- ERD view shortcut (opens table in ERD diagram)
- Export data from current result

**Tech Evidence:**
- Files: `components/modules/quick-query/QuickQuery.vue`
- Hooks: `useQuickQuery.ts`, `useQuickQueryMutation.ts`, `useQuickQueryTableInfo.ts`, `useReferencedTables.ts`, `useSafeModeDialog.ts`
- API: `server/api/tables/` (bulk-delete, bulk-update, ddl, export, indexes, meta, overview, rls, rules, size, structure, triggers)
- Store: `useQuickQueryLogs.ts`

---

### 7. Raw Query — SQL Editor

**Description:** A full-featured SQL code editor for writing and executing arbitrary SQL. Supports multiple statements, result tabs, EXPLAIN analysis, variables, and file persistence.

**Capabilities:**

**Editor:**
- CodeMirror 6 with SQL syntax highlighting
- Smart autocomplete (tables, columns, schemas from connected DB)
- Format entire SQL script
- Format current SQL statement only
- Context menu (execute, explain, format)
- Cursor position indicator in footer
- Minimap toggle
- Font size config

**Execution:**
- Execute current statement (Ctrl/Cmd+Enter)
- Execute all statements
- Serialized mode (statements run sequentially)
- Multi-statement results displayed in separate tabs
- Active result tab navigation
- Query process state indicator

**EXPLAIN / Analyze:**
- Run EXPLAIN ANALYZE on current statement
- Multiple explain format options
- Performance plan visualization

**Variables:**
- Define named variables in a side panel
- Use `{{variable}}` syntax in queries
- Variable usage guide popover

**File System:**
- Each query is a file stored in the Explorer tree
- File content persisted (NeDB `rowQueryFiles.db` / IndexedDB)
- Switch connection per file
- Connection execution confirm dialog (warns if file was last run on a different connection)

**Environment Safety:**
- Strict mode tag check on execution (if connection has strict-mode tag)
- Visual environment badge in editor header

**Tech Evidence:**
- Files: `components/modules/raw-query/RawQuery.vue`
- Hooks: `useRawQueryEditor.ts`, `useRawQueryFileContent.ts`
- API: `server/api/query/raw-execute.post.ts`, `raw-execute-stream.post.ts`, `execute.post.ts`
- Components: `VariableEditor.vue`, `RawQueryResultTabs.vue`, `RawQueryEditorContextMenu.vue`

---

### 8. ERD Diagram

**Description:** Interactive Entity-Relationship Diagram (ERD) that visualizes tables and their foreign key relationships using a canvas-based renderer.

**Capabilities:**
- **All Tables ERD**: render every table in the schema as nodes
- **Single Table ERD**: show one table and its direct FK relationships
- Zoom in/out and pan the canvas
- Table nodes show column names, types, PK/FK indicators
- Relationship edges for foreign keys
- Auto-layout algorithm for initial placement
- Searchable ERD sidebar (table list)
- Open ERD from Schema sidebar context menu
- ERD canvas in a dedicated tab

**Tech Evidence:**
- Files: `components/modules/erd-diagram/ErdDiagram.vue`, `WrapperErdDiagram.vue`
- Hooks: ERD hooks in `components/modules/erd-diagram/hooks/`
- Library: vue-flow (node-based canvas)
- API: `server/api/metadata/erd.post.ts`
- Store: `erdStore.ts`

---

### 9. Database Role & Permission Management

**Description:** Manage database users, roles, and their permissions without writing SQL. Visual role tree with grant/revoke operations.

**Capabilities:**
- View all database roles in a tree
- Create new database roles
- Delete roles
- View role inheritance hierarchy
- Browse databases and schemas per role
- View per-object privilege matrix (SELECT, INSERT, UPDATE, DELETE, etc.)
- Grant permission to a role on a specific object
- Revoke permission
- **Bulk grant permissions** (apply same grant to multiple objects at once)
- Role-level privilege management

**Tech Evidence:**
- Files: `components/modules/management/role-permission/ManagementUsersAndPermission.vue`
- Hooks: `useDatabaseRoles.ts`, `useRoleMutations.ts`, `useBulkGrantPermissions.ts`
- API: `server/api/database-roles/` (14 endpoints: create, delete, get-roles, get-schemas, grant, revoke, bulk-grant, role-inheritance, schema-objects, etc.)

---

### 10. Instance Insights — Database Monitor

**Description:** Real-time database server monitoring dashboard. Currently focused on PostgreSQL. Gives DBA-level visibility into server health, activity, and configuration.

**Capabilities:**

**Activity Tab:**
- Transactions per second (TPS)
- Tuple I/O metrics (read/write)
- Block I/O statistics
- Active session count

**State Tab:**
- Active sessions list
- Lock information
- Prepared transactions

**Configuration Tab:**
- Searchable `pg_settings` browser
- View current value, unit, description

**Replication Tab:**
- Replication slot list and status
- Replication statistics
- Drop a replication slot
- Toggle slot status (active/inactive)

**Actions:**
- Terminate a specific database connection/session
- Cancel a running query
- Auto-refresh interval toggle

**Tech Evidence:**
- Files: `components/modules/instance-insights/InstanceInsightsPanel.vue`
- Components: `InstanceInsightsActivitySection.vue`, `InstanceInsightsStateSection.vue`, `InstanceInsightsConfigurationSection.vue`, `InstanceInsightsReplicationSection.vue`
- API: `server/api/instance-insights/` (dashboard, state, configuration, replication, terminate-connection, cancel-query, drop-slot, toggle-slot-status)

---

### 11. Schema Diff Tool

**Description:** Compare two database schemas (from any two supported connections) and generate a migration SQL script highlighting what has changed.

**Capabilities:**
- Select source connection + target connection independently
- Side-by-side diff tree view (added / removed / changed objects)
- SQL migration script panel (auto-generated ALTER/CREATE/DROP statements)
- **Safe mode** toggle (suppresses destructive DROP statements)
- Compare tables, columns, indexes, constraints
- Copy/download generated migration SQL

**Tech Evidence:**
- Files: `components/modules/database-tools/schema-diff/`
- Components: `SchemaDiffTree.vue`, `SchemaDiffSqlPanel.vue`, `SchemaDiffConnectionSelector.vue`
- API: `server/api/schema-diff/index.post.ts`
- Server utility: `server/utils/schema-diff.utils.ts`

---

### 12. Database Backup & Restore (Database Tools)

**Description:** Native backup and restore using vendor CLI tools (pg_dump, pg_restore, mysqldump, etc.) with a UI wizard and job progress tracking.

**Capabilities:**

**Export:**
- Select export **format**: native, plain, custom, tar
- Select export **scope**: full / schema-only / data-only
- Target specific schemas or tables
- Set compression level (0–9)
- Options: omit ownership, omit privileges, add DROP statements, add CREATE DATABASE
- Background job with real-time progress updates
- Download the output file

**Import / Restore:**
- File dropzone for uploading backup files
- Import options form (analogous to export options)
- Restore confirm dialog
- Background job tracking
- SSH tunnel support during backup/restore

**Tech Evidence:**
- Files: `components/modules/database-tools/backup-restore/`
- Components: `ExportOptionsForm.vue`, `ImportOptionsForm.vue`, `ImportFileDropzone.vue`, `TransferProgressCard.vue`, `RestoreConfirmDialog.vue`
- API: `server/api/database-export/export-database.ts`, `server/api/database-import/import-database.ts`
- Backend: `server/infrastructure/database/backup/native-backup-jobs.ts`
- Job polling: `server/api/database-export/jobs/[jobId].get.ts`

---

### 13. AI Agent (Orca Agent)

**Description:** An AI-powered database assistant with direct, tool-augmented access to the connected database. Can answer questions, generate SQL, run queries, detect anomalies, render ERDs, and export data.

**Capabilities:**

**Multi-Provider AI:**
- OpenAI (GPT-4o, GPT-4 Turbo, etc.)
- Anthropic (Claude 3.5/3)
- Google (Gemini models)
- xAI (Grok)
- OpenRouter (router to any model)
- API key configured per provider in Settings

**AI Tools (Function Calling):**
| Tool | Purpose |
|---|---|
| `list_schemas` | Discover available schemas and table names |
| `get_table_schema` | Detailed column, key, FK info for a specific table |
| `generate_query` | Convert natural language to SQL |
| `render_table` | Execute SQL and display structured rows |
| `visualize_table` | Execute SQL + render bar/line/pie/scatter chart |
| `explain_query` | EXPLAIN ANALYZE with performance suggestions |
| `detect_anomaly` | Data quality scan: nulls, duplicates, orphan FKs, outliers |
| `describe_table` | Full schema introspection (columns, keys, relationships) |
| `export_query_result` | Re-execute SQL and package rows into CSV/JSON/SQL for download |
| `export_content` | Export free-form text/scripts/notes to a file |
| `render_erd` | Generate ERD diagram for selected tables |
| `askClarification` | Ask the user a clarifying question before proceeding |

**Safety:**
- Mutation queries (INSERT/UPDATE/DELETE/DROP) are NEVER auto-executed
- Agent shows generated SQL + explains the change, then asks for explicit confirmation

**Chat UX:**
- Multi-conversation history (create, rename, save, switch)
- Rename conversation title inline
- Show/hide reasoning panel
- Schema attachment panel (attach specific schema snapshots as context)
- Export preview panel (open exported files inline)
- Response navigator (jump to specific tool outputs in long conversations)
- Mermaid diagram rendering in chat (auto-detected and rendered)

**Tech Evidence:**
- Files: `components/modules/agent/`, `server/infrastructure/agent/`
- Hooks: `useDbAgentChat.ts`, `useDbAgentWorkspace.ts`, `useDbAgentAttachments.ts`, `useDbAgentRenderer.ts`
- API: `server/api/ai/agent.ts`, `server/api/ai/chat.ts`
- Tool blocks: `AgentTableBlock.vue`, `AgentVisualizeTableBlock.vue`, `AgentErdBlock.vue`, `AgentExplainBlock.vue`, `AgentAnomalyBlock.vue`, `AgentDescribeBlock.vue`, `AgentQueryBlock.vue`, `AgentExportFileBlock.vue`, `AgentApprovalBlock.vue`
- Store: `agentStore.ts`

---

### 14. Command Palette

**Description:** Universal keyboard-driven command interface (Cmd/Ctrl+K) for navigating to any object or executing system actions from anywhere in the app.

**Capabilities:**
- Fuzzy global search across all entity types
- Provider-based prefix search:
  - **Tables** — open table in quick query
  - **Views** — open view
  - **Functions** — open function detail
  - **Files** — open SQL query files
  - **ERD** — open ERD for a table
  - **Tabs** — switch to open tab
  - **System** — execute system commands (toggle sidebar, open settings, etc.)
- Context-aware results based on connected schema
- Keyboard navigation (arrows + Enter)

**Tech Evidence:**
- Files: `components/modules/command-palette/`
- Services: `commandRegistry.ts`
- Providers: `useTableCommands.ts`, `useViewCommands.ts`, `useFunctionCommands.ts`, `useFileCommands.ts`, `useErdCommands.ts`, `useTabCommands.ts`, `useSystemCommands.ts`

---

### 15. Multi-Tab Interface

**Description:** Tabbed workspace where each open item (table, query, ERD, etc.) is an independent tab with preserved state. Works like a browser or IDE.

**Tab Types:**

| Tab Type | Content |
|---|---|
| `TableDetail` | Quick Query grid for a table |
| `TableOverview` | Table overview panel |
| `ViewDetail` | View data and definition |
| `FunctionsDetail` | Function body + signature + rename/delete actions |
| `FunctionsOverview` | List of functions |
| `AllERD` | ERD for all tables |
| `DetailERD` | ERD for one table and its relations |
| `CodeQuery` | Raw SQL editor for a query file |
| `UserPermissions` | Role & permission management panel |
| `DatabaseTools` | Backup/restore or schema diff |
| `InstanceInsights` | DB monitor dashboard |
| `SchemaDiff` | Schema comparison tool |
| `AgentChat` | AI agent chat session |
| `Export` | Export management |
| `Connection` | Connection form |
| `Explorer` | File explorer |

**Capabilities:**
- Open multiple tabs simultaneously
- Drag-and-drop tab reordering
- Close individual tabs
- `<KeepAlive>` — tab state preserved when switching
- Tab synchronization with sidebar selection

**Tech Evidence:**
- Files: `core/stores/useTabViewsStore.ts`, `components/modules/app-shell/tab-view-container/`
- Components: `TabViews.vue`, `TabViewItem.vue`, `TabViewContainer.vue`, `TabViewOpenActions.vue`
- DnD: `@atlaskit/pragmatic-drag-and-drop`

---

### 16. Application Shell & Layout

**Description:** The master app layout with resizable panels, collapsible sidebars, and a configurable layout system.

**Capabilities:**
- **3-column resizable layout** (Primary Sidebar | Main Content | Secondary Sidebar)
- Toggle primary sidebar (Activity Bar)
- Toggle secondary sidebar
- Resizable splitter panels
- **Custom layout builder**: save named layout presets (up to `MAX_CUSTOM_LAYOUTS`)
- Per-layout panel size memory
- macOS-style traffic lights (titleBarStyle: 'hiddenInset')
- Status bar at bottom
- Connection bar (shows current workspace/connection)
- Download banner (for app updates)
- Responsive body layout (main content + bottom panel split)

**Tech Evidence:**
- Files: `core/stores/appConfigStore.ts`, `components/modules/app-shell/`
- Constants: `RawQueryEditorLayout`, `RawQueryEditorDefaultSize`, `MAX_CUSTOM_LAYOUTS`
- Layout builder: `settings/components/layout-builder/`

---

### 17. Settings

**Description:** Comprehensive user preferences panel covering appearance, editor, AI, and table display.

**Settings Panels:**

| Panel | Options |
|---|---|
| **Appearance** | Theme (light/dark), space display (compact / default / spacious) |
| **Code Editor** | Theme, font size, minimap, indentation style |
| **Quick Query** | Quick query specific behavior settings |
| **Agent** | API keys per AI provider (OpenAI, Anthropic, Google, xAI, OpenRouter), chat font size, code font size, thinking style (Shimmer/Scramble) |
| **Table Appearance** | Row height, font size, cell spacing, NULL sort order, accent colors (light/dark), header background, header font size/weight |
| **Desktop** | Desktop-only settings (electron-only panel) |
| **Environment Tags** | Manage tag list (CRUD, colors, strict mode) |
| **Backup & Restore** | Export all app data (workspaces, connections, queries, chat history, settings), Import from backup, Reset all data |

**Tech Evidence:**
- Files: `components/modules/settings/`
- Types: `settings.types.ts`
- Store: `appConfigStore.ts`
- Backup hooks: `useDataExport.ts`, `useResetAllData.ts`

---

### 18. App Data Backup & Restore (App-level)

**Description:** Export and import the entire application state (distinct from database backup). Allows portability between devices or recovery.

**Capabilities:**
- Export everything to a single `.json` backup file:
  - Workspaces
  - Connections
  - SQL query files
  - AI chat history
  - App settings
- Import / restore from that backup file
- **Reset all data** with a typed confirmation phrase (`"Reset all data"`)
- Progress indicator during export

**Tech Evidence:**
- Files: `components/modules/settings/components/BackupRestoreConfig.vue`
- Hooks: `useDataExport.ts`, `useResetAllData.ts`
- Sub-components: `backup-restore/RestoreDataPanel.vue`

---

### 19. Auto-Update System (Desktop Only)

**Description:** Seamless in-app update mechanism for the Electron desktop app using electron-updater.

**Capabilities:**
- Automatic update check on startup
- Update available notification (version, release notes)
- Background download of update
- Update ready to install notification
- Install and relaunch action
- Changelog popup shown after first launch post-update
- Update state cached (prevents duplicate notifications)
- Deferred update support (install on next quit)

**Tech Evidence:**
- Files: `electron/updater/index.ts`, `electron/ipc/window.ts`
- UI: `components/modules/changelog/ChangelogPopup.vue`
- IPC channel: `registerUpdaterHandlers()`

---

### 20. Recent Connections (Desktop Only)

**Description:** macOS Dock menu shortcut to recently opened database connections for one-click access.

**Capabilities:**
- Tracks last 10 opened connections in macOS Dock menu
- Click to open a connection directly in a new window
- Persisted across app restarts

**Tech Evidence:**
- Files: `electron/recent-connections.ts`
- Integration: Electron `app.dock.setMenu()` in `main.ts`
- Constant: `MAX_RECENT_CONNECTIONS = 10`

---

### 21. Multiple Windows (Desktop Only)

**Description:** Open multiple database connections simultaneously in separate application windows, each with independent routing state.

**Capabilities:**
- Open a connection in a new window
- Each window has its own hash-based route
- Focus existing window if already open
- Minimum window size: 1024×720
- Default window size: 1440×960

**Tech Evidence:**
- Files: `electron/main.ts` → `createWindow()`, `focusWindow()`
- IPC: `window.ts` handlers

---

### 22. Analytics & Telemetry

**Description:** Usage tracking via Amplitude to understand feature adoption and usage patterns.

**Capabilities:**
- Anonymized event tracking
- Client-side Amplitude Browser SDK
- Initialized via plugin on app boot

**Tech Evidence:**
- Files: `plugins/03.analytics.client.ts`
- Library: `@amplitude/analytics-browser`

---

### 23. Views Management

**Description:** Browse, inspect, and manage database views similarly to tables.

**Capabilities:**
- List all views in schema
- Open view in quick query grid
- View definition (SQL) panel
- View meta info
- View dependencies tab
- View indexes tab
- Explain view query

**Tech Evidence:**
- API: `server/api/views/` (definition, dependencies, explain, indexes, meta, overview)
- Components: `ViewOverview.vue`, `VirtualTableDefinition.vue`, `ViewDependencies.vue`, `ViewIndexesTab.vue`, `ViewMetaInfo.vue`

---

### 24. Functions Management

**Description:** Browse, inspect, and manage stored functions/procedures.

**Capabilities:**
- List all functions in schema
- Open function detail view
- View function signature
- View function body (definition)
- Update/edit function body
- Rename function
- Delete function

**Tech Evidence:**
- API: `server/api/functions/` (definition, delete, overview, rename, signature, update)
- Components: `FunctionDetail.vue`, `FunctionOverview.vue`

---

## 🧠 System Insights

### Key Strengths

1. **Dual-mode deployment**: The same codebase runs as a full desktop app (Electron) AND a web SPA with zero code divergence — the IPC bridge and IndexedDB polyfill are completely transparent.
2. **AI-native architecture**: The agent is not bolted on — it has structured tool schemas, safe mutation guardrails, schema-aware context injection, and purpose-built UI blocks for each tool output type.
3. **Safe Mode pattern**: Appears consistently across Quick Query mutations, Schema Diff, Agent mutations, and Raw Query strict mode — strong UX safety philosophy.
4. **Tab system with KeepAlive**: Every panel preserves its scroll position, state, and loaded data when switching tabs — significantly better UX than re-fetching on tab switch.
5. **Plugin-based autocomplete**: CodeMirror integration fetches actual live column/table names for SQL autocomplete, not static mocks.
6. **Modular architecture**: Clean `containers → hooks → services → types` separation across all feature modules.

### Partially Implemented / Coming Soon Features

| Feature | Evidence |
|---|---|
| **MongoDB support** | Listed in `DatabaseClientType` enum but no MongoDB adapter found in `server/infrastructure/database/adapters/` |
| **Redis support** | Listed in `DatabaseClientType` enum but no adapter |
| **Snowflake support** | Listed in `DatabaseClientType` enum but no adapter |
| **Export Management Panel** | `TabViewType.Export` exists + `ManagementExport.vue` referenced in sidebar skill but not fully wired |
| **Desktop Config Panel** | `SettingsComponentKey.DesktopConfig` exists but `DesktopConfig.vue` appears mostly scaffold |
| **`AgentChecklist` feature** | `components/modules/agent/check-list/` folder exists (agent task checklists) — unclear completion status |
| **`useQuizState`** | `useQuizState.ts` hook in agent — quiz/learning mode not visible in UI |
| **`SpaceDisplay`** | Enum defined (compact/default/spacious) but not all components fully adapt |

### Potential Improvements

1. **MongoDB/Redis/Snowflake**: The DB type enum and connection form already support them — completing the server adapters would expand reach significantly.
2. **Query result caching**: No caching layer for repeated identical queries — adding a short TTL cache in the server layer would improve responsiveness.
3. **Role-based access inside the app**: No app-level auth — anyone who can open the app can access all connections. An app-level PIN or biometric lock would strengthen security for shared machines.
4. **Table-level AI descriptions**: The `describe_table` agent tool could persist its output as inline documentation visible in the Schema Explorer sidebar.
5. **Export scheduling**: The backup/export system runs on demand; adding scheduled exports (cron-style) would be useful for automated workflows.
6. **Collaborative features**: Currently single-user. Shared workspaces or shared query files would be a natural next step.
7. **Query result diff**: Comparing two query result sets side-by-side (like a data diff) is a common DB workflow not yet present.
8. **Duplicated schema fetching**: `useSchemaStore` and agent's `list_schemas` tool both independently fetch schema metadata — a unified schema cache layer would reduce redundant DB round-trips.

### Notable Design Decisions

- **No SSR**: Intentional — the app is entirely client-side (SPA). All database queries go through the Nuxt server API layer (`/api/*`) which is a co-located H3 server, not an external service.
- **Hash routing in Electron**: Required because Electron loads from `file://` where history-mode routing fails. The config split (`nuxt.config.electron.ts` vs `nuxt.config.ts`) cleanly handles this.
- **Knex as query builder**: Used server-side as a DB abstraction layer — but not ORM-style. Raw query execution bypasses Knex and uses the drivers directly for performance.
- **NeDB → knex-SQLite migration**: Memory in `electron-persistence-current-state` notes an ongoing migration from NeDB to knex/better-sqlite3.

---

## 📁 File Map Summary

```
Entry Points:
  electron/main.ts          → Desktop app entry (window, IPC, updater)
  pages/index.vue           → Web home (workspace list)
  pages/[workspaceId]/[connectionId]/index.vue → Main workspace shell
  app.vue                   → Root component (CommandPalette, Settings, ChangelogPopup)

Feature Modules:
  components/modules/
    agent/                  → AI Agent chat
    app-shell/              → Layout shell (activity bar, sidebars, tabs)
    changelog/              → What's new popup
    command-palette/        → CMD+K interface
    connection/             → Connection form & management
    database-tools/         → Backup/restore + schema diff
    environment-tag/        → Color-coded env tags
    erd-diagram/            → ERD canvas
    instance-insights/      → DB server monitoring
    management/             → All left sidebar panels
    quick-query/            → Table data browser
    raw-query/              → SQL editor
    settings/               → App settings modal
    workspace/              → Workspace home screen
    selectors/              → Shared selector dropdowns

Server API:
  server/api/
    ai/                     → Streaming AI chat endpoint
    database-export/        → Backup export + job polling
    database-import/        → Restore import
    database-roles/         → Role/permission CRUD
    functions/              → Stored function CRUD
    instance-insights/      → DB monitor dashboards
    managment-connection/   → Health check
    metadata/               → ERD, schema metadata, reverse engineering
    metrics/                → Query performance metrics
    query/                  → Raw SQL execution
    schema-diff/            → Cross-connection schema comparison
    tables/                 → Table CRUD operations
    views/                  → View introspection

Core:
  core/stores/              → Pinia stores (workspaces, connections, tabs, schema, activity, config, agent)
  core/types/               → Shared TypeScript interfaces
  core/composables/         → Auto-imported composables
  core/constants/           → App-wide constants + DB client type enum
  core/persist/             → Store hydration logic
  core/storage/             → Storage API factory (NeDB/IndexedDB transparent wrapper)
```

---

*Report generated by reverse-engineering source code only. No documentation files were used as primary source.*