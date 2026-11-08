# OrcaQ Project Structure

**Version:** 1.0  
**Last Updated:** February 2026

Complete folder structure and file responsibilities for the OrcaQ database editor.

---

## Root Directory Overview

OrcaQ is a Bun-workspaces monorepo (`workspaces: ["apps/*"]`). The root
`package.json` proxies every script (`bun run dev`, `bun run typecheck`,
`bun test:unit`, `bun run electron:*`, `bun run npx:build`, ...) to the app that
owns it, so commands run from the repo root.

```
OrcaQ/
├── package.json              # Private workspace root + proxy scripts
├── bun.lock
├── .husky/                   # Pre-commit hooks (call root scripts)
├── .github/                  # CI workflows
├── docs/                     # Documentation
├── Dockerfile                # Builds apps/web, runs apps/web/.output
├── docker-compose.yml
├── SAC/                      # Nginx load-balancer compose example
├── .dependency-cruiser.js    # Run from apps/web (`bun run depcruise:json`)
│
├── apps/
│   ├── web/                  # @orcaq/web — Nuxt 4 app (web build, used by desktop + cli)
│   │   ├── nuxt.config.ts    # Nuxt configuration
│   │   ├── components.json   # shadcn-vue configuration
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   ├── playwright.config.ts
│   │   ├── ecosystem.config.js
│   │   ├── .storybook/
│   │   ├── app/              # Client code (`~/` alias)
│   │   │   ├── app.vue       # Root Vue application entry
│   │   │   ├── error.vue     # Global error page
│   │   │   ├── spa-loading-template.html
│   │   │   ├── assets/
│   │   │   ├── components/
│   │   │   ├── layouts/
│   │   │   ├── middleware/
│   │   │   ├── pages/
│   │   │   ├── plugins/
│   │   │   ├── lib/
│   │   │   └── core/         # Client-only: stores, composables, contexts, persist, ...
│   │   ├── server/           # Nitro server (API routes, DB adapters, MCP, AI)
│   │   ├── shared/           # Used by client + server + electron (`#shared/...`):
│   │   │                     #   types, constants, helpers, sql-dialect, persist/normalize,
│   │   │                     #   storage/idbRegistry
│   │   ├── types/            # Ambient *.d.ts
│   │   ├── public/           # Public static files
│   │   ├── test/             # unit / nuxt / api / playwright suites + fixtures
│   │   └── scripts/test-services/  # Fixture start/stop/seed scripts
│   │
│   ├── desktop/              # @orcaq/desktop — Electron wrapper
│   │   ├── electron/         # Main/preload sources, persistence, sidecar
│   │   ├── electron-builder.yml
│   │   └── scripts/electron-before-build.mjs  # apps/web/.output → apps/desktop/out/runtime
│   │
│   └── cli/                  # `orcaq` npx package
│       ├── bin/cli.mjs
│       └── scripts/build-npx.mjs  # apps/web/.output → apps/cli/.output
```

Import rule: `apps/web/server/**`, `apps/web/shared/**` and `apps/desktop/electron/**`
import shared code via `#shared/...`, never via `~/` (the client `app/` directory).
`shared/` must not import `app/` or `server/`.

---

## Core Directories

### `apps/web/app/components` - Vue Components

```
components/
├── activity-bar/              # Left sidebar activity navigation
│   ├── ActivityBar.vue        # Horizontal activity bar
│   ├── ActivityBarVertical.vue
│   └── constants/             # Activity menu configuration
│
├── base/                      # Reusable base components
│   ├── Tree/                  # Tree view component (folders, items)
│   ├── code-editor/           # CodeMirror SQL editor
│   ├── context-menu/          # Right-click context menu
│   ├── data-grid/             # Shared AG Grid shell and utilities
│   ├── BaseEmpty.vue          # Empty state
│   └── LoadingOverlay.vue     # Loading spinner
│
├── modules/                   # Feature modules (13 modules)
│   ├── quick-query/           # Table data browsing & editing
│   ├── raw-query/             # SQL code editor
│   ├── management-schemas/    # Schema tree explorer
│   ├── management-connection/ # Database connections
│   ├── management-users/      # User permissions
│   ├── management-explorer/   # File explorer
│   ├── management-export/     # Data export
│   ├── erd-diagram/           # Entity-relationship diagrams
│   ├── workspace/             # Workspace management
│   ├── settings/              # Application settings
│   ├── changelog/             # Version changelog
│   └── selectors/             # Custom select components
│
├── ui/                        # shadcn-vue UI components (33+)
│   ├── button/
│   ├── dialog/
│   ├── dropdown-menu/
│   ├── form/
│   ├── input/
│   ├── select/
│   ├── table/
│   ├── tabs/
│   ├── tooltip/
│   └── ...                    # + 24 more UI components
│
├── tab-view-container/        # Tab management
├── primary-side-bar/          # Left sidebar content
├── secondary-side-bar/        # Right sidebar content
└── status-bar/                # Bottom status bar
```

---

### `apps/web/app/core` - Client Application Logic

Client-only stores, contexts and persistence. Types and constants that the
server or electron also need live in `apps/web/shared/` (`#shared/...`).

```
core/
├── stores/                    # Pinia stores (12 stores)
│   ├── index.ts               # Barrel export
│   ├── useWorkspacesStore.ts  # Workspace CRUD
│   ├── managementConnectionStore.ts  # Connections
│   ├── useWSStateStore.ts     # Workspace state (context)
│   ├── useTabViewsStore.ts    # Tab management
│   ├── useSchemaStore.ts      # Schema metadata cache
│   ├── useActivityBarStore.ts # Activity bar state
│   ├── appConfigStore.ts      # Layout & settings
│   ├── erdStore.ts            # ERD diagram state
│   ├── useExplorerFileStore.ts # SQL file explorer
│   └── useQuickQueryLogs.ts   # Query history logs
│
├── contexts/                  # Shared contexts (provide/inject)
│   ├── useAppContext.ts       # Global app context facade
│   ├── useChangelogModal.ts   # Changelog modal state
│   └── useSettingsModal.ts    # Settings modal state
│
├── persist/                   # Persistence layer
│   ├── index.ts               # Unified API
│   ├── workspaceIDBApi.ts     # Workspace IndexedDB
│   ├── connectionIDBApi.ts    # Connection IndexedDB
│   ├── tabViewsIDBApi.ts      # Tab views IndexedDB
│   ├── quickQueryLogsIDBApi.ts # Query logs IndexedDB
│   ├── rowQueryFile.ts        # SQL file persistence
│   └── workspaceStateIDBApi.ts # State persistence
│
├── helpers/                   # Client-only helpers: clipboard, copy-data
│                              #   (file-saver/papaparse), deepUnRef (vue), cell-value (AG Grid)
├── constants/agent.ts         # AI provider/model list (uses settings module types)
└── data/                      # Static data (changelog)
```

---

### `apps/web/shared` - Client + Server + Electron Code

Environment-neutral code imported as `#shared/...` (relative imports inside
`shared/`, so electron's tsc output needs no alias). It must not import `app/`
or `server/`. Nuxt's auto-import of `shared/types` and `shared/utils` is turned
off in `nuxt.config.ts`; import shared code explicitly.

```
shared/
├── types/                     # Entity + API types (barrel: `#shared/types`)
│   ├── entities/              # Workspace, connection, tab view, ... entities
│   ├── agent.types.ts         # AI agent tool/message types (agent module + server)
│   └── schema-diff.types.ts   # Schema diff request/response (database-tools + server)
├── constants/                 # database-client-type, connection-capabilities, ...
├── helpers/                   # Pure helpers (barrel: `#shared/helpers`): sql-*,
│                              #   database-error, parser-connection-string, mcp-token,
│                              #   environment, generateFunctionSQL (schemas module + server)
├── sql-dialect/               # Per-database SQL dialects
├── persist/normalize.ts       # AppConfig/AgentState normalize (web, server MCP, electron)
└── storage/idbRegistry.ts     # Persist collection registry (web + electron)
```

---

### `apps/web/app/core/composables` - Vue Composables

```
composables/
├── useAiChat.ts               # AI chat integration
├── useAmplitude.ts            # Analytics tracking
├── useAppLoading.ts           # Global loading state
├── useCopyToClipboard.ts      # Clipboard operations
├── useHotKeys.ts              # Keyboard shortcuts
├── useRangeSelectionTable.ts  # Table cell selection
├── useSqlHighlighter.ts       # SQL syntax highlighting
├── useStreamingDownload.ts    # File streaming downloads
├── useTableActions.ts         # Table CRUD operations
├── useTableQueryBuilder.ts    # Query building logic
└── useTableSize.ts            # Table sizing utilities
```

---

### `apps/web/server` - Nuxt Server API

```
server/
├── api/                       # API endpoints (26+)
│   ├── ai/                    # AI endpoints
│   │   └── chat.ts            # AI chat completion
│   ├── database-export/       # Export endpoints
│   ├── database-roles/        # Role management
│   ├── managment-connection/  # Connection health
│   │
│   ├── execute.ts             # Execute SQL query
│   ├── raw-execute.ts         # Raw SQL execution
│   ├── execute-bulk-update.ts # Bulk updates
│   ├── execute-bulk-delete.ts # Bulk deletes
│   ├── get-tables.ts          # Table metadata
│   ├── get-one-table.ts       # Single table detail
│   ├── get-schema-meta-data.ts # Schema metadata
│   ├── get-table-structure.ts # Table columns
│   ├── get-table-ddl.ts       # Table DDL
│   ├── export-table-data.ts   # Data export (CSV/JSON/SQL)
│   ├── get-function-signature.ts # Function params
│   ├── update-function.ts     # Update function
│   ├── delete-function.ts     # Delete function
│   └── ...                    # More endpoints
│
├── middleware/                # Server middleware
│   └── logging.ts             # Request logging
│
└── utils/                     # Server utilities
    ├── db-connection.ts       # Connection pooling
    └── ...
```

---

### `apps/web/app/pages` - File-Based Routing

```
pages/
├── index.vue                  # Home (workspace selection)
│
└── [workspaceId]/             # Workspace routes
    ├── index.vue              # Workspace home
    │
    └── [connectionId]/        # Connection routes
        ├── index.vue          # Connection dashboard
        │
        ├── explorer/          # SQL file editor
        │   └── [fileId].vue   # Raw query editor
        │
        ├── erd/               # ERD diagrams
        │   ├── index.vue      # All tables ERD
        │   └── [tableId].vue  # Single table ERD
        │
        ├── quick-query/       # Quick query routes
        │   ├── [tabViewId].vue              # Table query
        │   ├── table-over-view/index.vue    # Tables list
        │   ├── view-over-view/              # Views list
        │   ├── function-over-view/          # Functions list
        │   └── table-detail/[schemaName]/[tableName].vue
        │
        └── schemas/           # Schema routes
            └── [schemaId].vue
```

---

### `/utils` - Utility Functions

```
utils/
├── common/                    # Common utilities
│   ├── formatters.ts          # Data formatting
│   ├── exportToCSV.ts         # CSV export
│   ├── exportToJSON.ts        # JSON export
│   └── copyToClipboard.ts     # Clipboard helpers
│
├── constants/                 # App constants
│   ├── operators.ts           # SQL operators
│   └── agents.ts              # AI agent configs
│
├── quickQuery/                # Quick Query utilities
│   ├── queryBuilder.ts        # SQL query builder
│   ├── filterParser.ts        # Filter parsing
│   └── ...
│
└── sql-generators/            # SQL DDL generators
    ├── index.ts               # Exports
    ├── generateTableSQL.ts    # Table SQL (CREATE, INSERT, etc.)
    ├── generateFunctionSQL.ts # Function SQL
    └── generateViewSQL.ts     # View SQL
```

---

### `apps/web/app/assets` - Static Assets

```
assets/
├── css/
│   ├── tailwind.css           # Tailwind entry
│   └── global.css             # Global styles
│
└── fonts/                     # Custom fonts
    ├── Alpino/
    ├── Chillax/
    ├── GeneralSans/
    └── Satoshi/
```

---

### `apps/web/app/layouts` - Page Layouts

```
layouts/
├── default.vue                # Main app layout (3-panel)
└── home.vue                   # Landing page layout
```

---

## Module Deep Dive

### Quick Query Module

```
apps/web/app/components/modules/quick-query/
├── QuickQuery.vue             # Main component (581 lines)
├── SafeModeConfirmDialog.vue  # Safe mode confirmation
├── QuickQueryErrorPopup.vue   # Error display
├── constants/
├── hooks/
│   ├── useQuickQuery.ts       # Context hook
│   ├── useQuickQueryMutation.ts # CRUD operations
│   └── useQuickQueryTableInfo.ts # Table metadata
├── quick-query-control-bar/   # Top toolbar
├── quick-query-filter/        # Filter panel
├── quick-query-table/         # AG Grid data table
├── quick-query-table-summary/ # Summary footer
├── quick-query-history-log-panel/ # History logs
├── preview/                   # Cell preview
├── previewRelationTable/      # Related table preview
└── structure/                 # Table structure view
```

### Raw Query Module

```
apps/web/app/components/modules/raw-query/
├── RawQuery.vue               # Main component
├── components/
│   ├── RawQueryLayout.vue     # Resizable layout
│   ├── RawQueryEditorHeader.vue # Toolbar
│   ├── RawQueryEditorFooter.vue # Status bar
│   ├── RawQueryResultTabs.vue # Result tabs
│   ├── VariableEditor.vue     # SQL variables
│   └── ...
├── hooks/
│   ├── useRawQueryEditor.ts   # Editor logic
│   └── useRawQueryFileContent.ts # File content
├── types/
├── constants/
└── utils/
```

---

## Key Configuration Files

| File                          | Purpose                                      |
| ----------------------------- | -------------------------------------------- |
| `apps/web/nuxt.config.ts`     | Nuxt modules, Tailwind, shadcn, Pinia config |
| `apps/web/components.json`    | shadcn-vue component settings                |
| `apps/web/tailwind.config.ts` | Tailwind theme extensions                    |
| `apps/web/tsconfig.json`      | TypeScript paths and settings                |
| `.prettierrc`                 | Code formatting rules                        |
