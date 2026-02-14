# OrcaQ Project Structure

**Version:** 1.0  
**Last Updated:** February 2026

Complete folder structure and file responsibilities for the OrcaQ database editor.

---

## Root Directory Overview

```
HeraQ/
├── app.vue                    # Root Vue application entry
├── error.vue                  # Global error page
├── nuxt.config.ts            # Nuxt configuration (web mode)
├── nuxt.config.electron.ts   # Nuxt configuration (Electron mode)
├── components.json           # shadcn-vue configuration
├── tailwind.config.ts        # Tailwind CSS configuration
├── tsconfig.json             # TypeScript configuration
├── package.json              # Dependencies & scripts
│
├── assets/                   # Static assets
├── components/               # Vue components
├── composables/              # Vue composables
├── docs/                     # Documentation
├── electron/                 # Electron desktop wrapper
├── layouts/                  # Page layouts
├── lib/                      # Library utilities
├── pages/                    # File-based routing
├── plugins/                  # Nuxt plugins
├── public/                   # Public static files
├── scripts/                  # Build scripts
├── server/                   # Server API routes
├── shared/                   # Shared application logic
└── utils/                    # Utility functions
```

---

## Core Directories

### `/components` - Vue Components

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
│   ├── dynamic-table/         # Generic data table
│   ├── BaseEmpty.vue          # Empty state
│   ├── LoadingOverlay.vue     # Loading spinner
│   └── TableSkeleton.vue      # Loading placeholder
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

### `/shared` - Shared Application Logic

```
shared/
├── stores/                    # Pinia stores (12 stores)
│   ├── index.ts               # Barrel export
│   ├── useWorkspacesStore.ts  # Workspace CRUD
│   ├── managementConnectionStore.ts  # Connections
│   ├── useWSStateStore.ts     # Workspace state (context)
│   ├── useTabViewsStore.ts    # Tab management
│   ├── useSchemaStore.ts      # Schema metadata cache
│   ├── useActivityBarStore.ts # Activity bar state
│   ├── appLayoutStore.ts      # Layout & settings
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
├── types/                     # Shared TypeScript types
│   ├── database-export.types.ts
│   ├── database-roles.types.ts
│   └── schemaMeta.type.ts
│
├── constants/                 # Shared constants
└── data/                      # Static data (changelog)
```

---

### `/composables` - Vue Composables

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

### `/server` - Nuxt Server API

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

### `/pages` - File-Based Routing

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

### `/assets` - Static Assets

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

### `/layouts` - Page Layouts

```
layouts/
├── default.vue                # Main app layout (3-panel)
└── home.vue                   # Landing page layout
```

---

## Module Deep Dive

### Quick Query Module

```
components/modules/quick-query/
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
components/modules/raw-query/
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
├── interfaces/
├── constants/
└── utils/
```

---

## Key Configuration Files

| File                 | Purpose                                      |
| -------------------- | -------------------------------------------- |
| `nuxt.config.ts`     | Nuxt modules, Tailwind, shadcn, Pinia config |
| `components.json`    | shadcn-vue component settings                |
| `tailwind.config.ts` | Tailwind theme extensions                    |
| `tsconfig.json`      | TypeScript paths and settings                |
| `.prettierrc`        | Code formatting rules                        |
