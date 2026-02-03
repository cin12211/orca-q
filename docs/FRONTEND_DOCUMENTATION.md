# OrcaQ Frontend Documentation

## 1. Overview

### Application Purpose

**OrcaQ** is a next-generation desktop database editor designed for managing, querying, and manipulating data across PostgreSQL database management systems. It provides an intuitive, fast, and secure interface for database operations with both quick query capabilities and raw SQL editing features.

### Target Users

- Software Developers
- Data Engineers
- Database Administrators (DBAs)
- Data Analysts
- Anyone working with PostgreSQL databases

### Core Business Features

- **Workspace Management**: Organize multiple database connections within independent workspaces
- **Quick Query Interface**: Interactive table browsing with filtering, sorting, and inline editing
- **Raw SQL Editor**: Full-featured SQL editor with syntax highlighting, auto-completion, and multi-query execution
- **Database Explorer**: Browse database structures, tables, schemas, views, and functions
- **ERD Diagram**: Visual entity-relationship diagram for database schema visualization
- **Connection Management**: Secure storage and management of database connections
- **Query History**: Track and reuse previous queries
- **Data Export**: Export table data in various formats
- **AI-Powered Chat**: Integrated AI assistant for SQL query generation and assistance

---

## 2. Tech Stack

### Core Framework

- **Nuxt 3** (v3.16.2) - Vue.js meta-framework with SSR disabled (SPA mode)
- **Vue 3** (v3.5.13) - Composition API with TypeScript
- **TypeScript** (v5.6.3) - Type-safe development

### State Management

- **Pinia** (v3.0.1) - Official Vue.js store with Pinia ORM
- **pinia-plugin-persistedstate** (v4.2.0) - State persistence to localStorage/IndexedDB

### Styling & UI

- **Tailwind CSS** (v4.1.2) - Utility-first CSS framework
- **@tailwindcss/vite** (v4.1.2) - Tailwind Vite integration
- **shadcn-nuxt** (v2.0.0) - Shadcn UI components for Nuxt
- **Reka UI** (v2.3.1) - Headless UI component library
- **lucide-vue-next** (v0.487.0) - Icon library
- **Custom Fonts**: Chillax, Alpino, General Sans, Satoshi

### Data Visualization

- **@tanstack/vue-table** (v8.21.2) - Headless table component
- **@tanstack/vue-virtual** (v3.13.12) - Virtual scrolling for large datasets
- **AG Grid** (v33.2.4) - Advanced data grid for complex tables
- **vue-echarts** (v7.0.3) - Chart visualization
- **@vue-flow/core** (v1.43.1) - ERD diagram rendering

### Code Editor

- **CodeMirror 6** (v6.0.2) - SQL code editor
- **@codemirror/lang-sql** (v6.8.0) - SQL language support
- **@codemirror/autocomplete** (v6.18.6) - Auto-completion
- **vue-codemirror** (v6.1.1) - Vue wrapper for CodeMirror
- **@sqltools/formatter** (v1.2.5) - SQL formatting

### Database & Backend

- **TypeORM** (v0.3.24) - Database ORM
- **pg** (v8.14.1) - PostgreSQL client
- **pg-query-stream** (v4.10.3) - Streaming query results
- **dt-sql-parser** (v4.3.1) - SQL parser for validation
- **pgsql-ast-parser** (v12.0.1) - PostgreSQL AST parser

### AI Integration

- **ai** (v6.0.27) - Vercel AI SDK
- **@ai-sdk/anthropic** (v3.0.9) - Anthropic (Claude) integration
- **@ai-sdk/openai** (v3.0.7) - OpenAI integration
- **@ai-sdk/google** (v3.0.6) - Google AI integration
- **@ai-sdk/vue** (v3.0.27) - Vue bindings for AI SDK

### Form & Validation

- **vee-validate** (v4.15.0) - Form validation
- **@vee-validate/zod** (v4.15.0) - Zod schema validation
- **zod** (v4.3.5) - TypeScript-first schema validation

### Utilities

- **@vueuse/core** (v13.1.0) - Vue composition utilities
- **dayjs** (v1.11.13) - Date manipulation
- **lodash-es** (v4.17.21) - Utility functions
- **klona** (v2.0.6) - Deep cloning
- **file-saver** (v2.0.5) - File download
- **papaparse** (v5.5.3) - CSV parsing
- **localforage** (v1.10.0) - Offline storage

### Desktop Integration

- **Electron** - Desktop application wrapper (separate electron/ folder)

### Analytics & Monitoring

- **@amplitude/analytics-browser** (v2.21.1) - User analytics
- **vue-sonner** (v1.3.2) - Toast notifications

### Build Tools

- **Vite** (v6.3.5) - Build tool and dev server
- **nuxt-typed-router** (v3.8.0) - Type-safe routing

---

## 3. Project Structure

### Root Level Organization

```
├── app.vue                    # Root application component
├── error.vue                  # Global error page
├── nuxt.config.ts            # Nuxt configuration (web)
├── nuxt.config.electron.ts   # Nuxt configuration (Electron)
├── tailwind.config.ts        # Tailwind CSS configuration
├── tsconfig.json             # TypeScript configuration
├── components.json           # Shadcn UI configuration
```

### Key Directories

#### `/assets` - Static Assets

- `/css` - Global stylesheets (Tailwind CSS)
- `/fonts` - Custom font families (Alpino, Chillax, General Sans, Satoshi)
- `global.css` - Global CSS styles

#### `/components` - Vue Components

**Feature-based organization with atomic design principles:**

- `/activity-bar` - Sidebar navigation components
  - Activity menu configuration
  - Horizontal and vertical activity bars
- `/base` - Reusable base components
  - Tree component for hierarchical data
  - Code editor wrapper
  - Context menu
  - Dynamic table
  - Loading overlays
  - Empty states
- `/modules` - Feature-specific modules
  - `/management-connection` - Connection CRUD operations
  - `/management-explorer` - File/folder explorer
  - `/management-schemas` - Schema management
  - `/quick-query` - Interactive table queries
  - `/raw-query` - SQL editor
  - `/erd-diagram` - Entity-relationship diagrams
  - `/workspace` - Workspace management
  - `/settings` - Application settings
  - `/changelog` - Version changelog display
  - `/selectors` - Custom select components
- `/ui` - Shadcn UI components (35+ components)
  - Buttons, forms, dialogs, tables, etc.
- `/tab-view-container` - Tab management system
- `/primary-side-bar` - Left sidebar
- `/secondary-side-bar` - Right sidebar
- `/status-bar` - Bottom status information

#### `/composables` - Composition Functions

Vue composables for reusable logic:

- `useAiChat.ts` - AI chat integration
- `useAmplitude.ts` - Analytics tracking
- `useAppLoading.ts` - Global loading state
- `useCopyToClipboard.ts` - Clipboard operations
- `useHotKeys.ts` - Keyboard shortcuts
- `useRangeSelectionTable.ts` - Table range selection
- `useSqlHighlighter.ts` - SQL syntax highlighting
- `useTableActions.ts` - Table CRUD operations
- `useTableQueryBuilder.ts` - Query builder logic
- `useTableSize.ts` - Table sizing utilities

#### `/layouts` - Page Layouts

- `default.vue` - Main application layout (with resizable panels)
- `home.vue` - Home/landing page layout

#### `/pages` - Route Pages

File-based routing structure:

```
/pages
  ├── index.vue                                    # Home page
  └── [workspaceId]/
      ├── index.vue                                # Workspace home
      └── [connectionId]/
          ├── index.vue                            # Connection home
          ├── explorer/[fileId].vue                # SQL file explorer
          ├── erd/
          │   ├── index.vue                        # All ERD diagrams
          │   └── [tableId].vue                    # Single table ERD
          └── quick-query/
              ├── [tabViewId].vue                  # Quick query tab
              ├── table-over-view/index.vue        # Tables overview
              ├── view-over-view/
              │   ├── index.vue                    # Views overview
              │   └── [tabViewId].vue              # View detail
              ├── function-over-view/
              │   ├── index.vue                    # Functions overview
              │   └── [functionName].vue           # Function detail
              └── table-detail/[schemaName]/[tableName].vue  # Table detail
```

#### `/server` - Nuxt Server API

Backend API routes (Nuxt server handlers):

- `/api` - RESTful endpoints
  - Database query execution
  - Table/schema metadata
  - Connection management
  - Function/view operations
  - AI chat endpoints
  - Export functionality
- `/middleware` - Server middleware (logging)
- `/utils` - Server utilities (DB connection pooling)

#### `/shared` - Shared Application Logic

**Cross-cutting concerns:**

- `/stores` - Pinia stores (12 stores)
  - `useWorkspacesStore.ts` - Workspace management
  - `managementConnectionStore.ts` - Connection management
  - `useTabViewsStore.ts` - Tab state management
  - `useSchemaStore.ts` - Schema metadata
  - `useActivityBarStore.ts` - Activity bar state
  - `appLayoutStore.ts` - Layout configuration
  - `erdStore.ts` - ERD diagram state
  - `useExplorerFileStore.ts` - File explorer state
  - `useQuickQueryLogs.ts` - Query history
  - `useWSStateStore.ts` - Workspace state persistence
- `/contexts` - Shared context hooks
  - `useAppContext.ts` - Global app context (connection, schema management)
  - `useChangelogModal.ts` - Changelog modal state
  - `useSettingsModal.ts` - Settings modal state
- `/persist` - IndexedDB/Electron persistence layer
  - `workspaceIDBApi.ts` - Workspace persistence
  - `connectionIDBApi.ts` - Connection persistence
  - `tabViewsIDBApi.ts` - Tab views persistence
  - `quickQueryLogsIDBApi.ts` - Query logs persistence
  - `rowQueryFile.ts` - SQL file persistence
  - `workspaceStateIDBApi.ts` - Workspace state persistence
- `/types` - Shared TypeScript types
- `/constants` - Shared constants
- `/data` - Static data (changelog content)

#### `/utils` - Utility Functions

- `/common` - Common utilities (formatting, export, copy)
- `/constants` - Constants (operators, agents)
- `/quickQuery` - Query building utilities
- `/sql-generators` - SQL generation for DDL statements

#### `/plugins` - Nuxt Plugins

- `error-handler.ts` - Global error handling
- `pinia-orm.client.ts` - Pinia ORM setup

#### `/electron` - Electron Desktop App

Separate Electron application wrapper (standalone package)

#### `/scripts` - Build Scripts

- `build-app.sh` - Application build script
- `build-npx.mjs` - NPX package builder
- `sync-version.mjs` - Version synchronization

---

## 4. Architecture Overview

### Architecture Style

**Feature-Based Modular Architecture** with clear separation of concerns:

1. **Presentation Layer** (`/components/modules`)
   - Feature modules are self-contained
   - Each module owns its UI, logic, and local state
2. **State Management Layer** (`/shared/stores`)
   - Centralized Pinia stores for global state
   - Workspace, connection, and schema management
   - Tab view orchestration
3. **Business Logic Layer** (`/composables`, `/shared/contexts`)
   - Reusable composition functions
   - Shared business logic contexts
4. **Data Access Layer** (`/server/api`, `/shared/persist`)
   - Server API routes for database operations
   - IndexedDB for offline persistence (web mode)
   - Electron IPC for desktop persistence
5. **Utility Layer** (`/utils`)
   - Pure functions for data transformation
   - SQL generation utilities

### Key Architectural Patterns

#### 1. **Composition API Pattern**

All components use Vue 3 Composition API with TypeScript:

```typescript
<script setup lang="ts">
// Composables and stores
const tabViewStore = useTabViewsStore();
const { tabViews } = toRefs(tabViewStore);

// Computed properties
const activeTab = computed(() =>
  tabViews.value.find(t => t.id === props.tabViewId)
);

// Lifecycle hooks
onMounted(async () => {
  await loadData();
});
</script>
```

#### 2. **Store Pattern (Pinia)**

```typescript
export const useWorkspacesStore = defineStore(
  'workspaces',
  () => {
    const workspaces = ref<Workspace[]>([]);

    const createWorkspace = async (workspace: Workspace) => {
      await window.workspaceApi.create(workspace);
      workspaces.value.push(workspace);
    };

    return { workspaces, createWorkspace };
  },
  {
    persist: false, // Handled by IndexedDB/Electron
  }
);
```

#### 3. **Dual Persistence Strategy**

- **Web Mode**: Uses IndexedDB via localforage
- **Desktop Mode**: Uses Electron IPC to filesystem
- Abstraction layer in `/shared/persist` provides unified API

#### 4. **Server-Side API Pattern**

Nuxt server routes handle database operations:

```typescript
export default defineEventHandler(async event => {
  const body = await readBody(event);
  const dataSource = await getDatabaseSource({
    dbConnectionString: body.dbConnectionString,
    type: 'postgres',
  });
  return await dataSource.query(body.query);
});
```

#### 5. **Component Communication**

- **Props down, Events up** for parent-child communication
- **Provide/Inject** for deep component trees
- **Pinia stores** for cross-cutting state
- **Composables** for shared logic

---

## 5. Routing

### Routing Configuration

**Nuxt File-based Routing** with typed routes via `nuxt-typed-router`

### Route Structure

#### Public Routes

- `/` - Home page (workspace selection)

#### Workspace Routes

- `/[workspaceId]` - Workspace detail
- `/[workspaceId]/index` - Workspace home (connection management)

#### Connection Routes

All routes below require `workspaceId` and `connectionId`:

**Quick Query Routes:**

- `/[workspaceId]/[connectionId]/quick-query/[tabViewId]` - Table quick query
- `/[workspaceId]/[connectionId]/quick-query/table-over-view` - Tables overview
- `/[workspaceId]/[connectionId]/quick-query/view-over-view` - Views overview
- `/[workspaceId]/[connectionId]/quick-query/view-over-view/[tabViewId]` - View detail
- `/[workspaceId]/[connectionId]/quick-query/function-over-view` - Functions overview
- `/[workspaceId]/[connectionId]/quick-query/function-over-view/[functionName]` - Function detail
- `/[workspaceId]/[connectionId]/quick-query/table-detail/[schemaName]/[tableName]` - Table structure

**ERD Routes:**

- `/[workspaceId]/[connectionId]/erd` - All ERD diagrams
- `/[workspaceId]/[connectionId]/erd/[tableId]` - Single table ERD

**Explorer Routes:**

- `/[workspaceId]/[connectionId]/explorer/[fileId]` - SQL file editor (raw query)

### Route Guards & Meta

```typescript
definePageMeta({
  layout: 'default',
  notAllowBottomPanel: true, // Disable bottom panel
  notAllowRightPanel: true, // Disable right sidebar
});
```

### Type-Safe Navigation

```typescript
// Using typed router
const route = useRoute('workspaceId-connectionId-quick-query-tabViewId');
const tabViewId = route.params.tabViewId; // Type-safe params

// Navigation
await navigateTo({
  name: 'workspaceId-connectionId-quick-query-tabViewId',
  params: { workspaceId, connectionId, tabViewId },
});
```

### Dynamic Route Parameters

- `[workspaceId]` - UUID of workspace
- `[connectionId]` - UUID of database connection
- `[tabViewId]` - Composite ID (schemaId + tableName)
- `[tableId]` - Table identifier
- `[fileId]` - SQL file identifier
- `[schemaName]` - Database schema name
- `[tableName]` - Database table name
- `[functionName]` - Database function name

---

## 6. State Management

### Store Architecture

**12 Pinia Stores** organized by domain:

#### 1. **Workspace Store** (`useWorkspacesStore`)

```typescript
interface Workspace {
  id: string;
  icon: string;
  name: string;
  desc?: string;
  lastOpened?: string;
  createdAt: string;
  updatedAt?: string;
}
```

**Responsibilities:**

- CRUD operations for workspaces
- Workspace selection tracking
- Last opened timestamp management

#### 2. **Workspace State Store** (`useWSStateStore`)

**Central orchestrator for workspace context:**

```typescript
interface WorkspaceState {
  workspaceId: string;
  connectionId: string;
  schemaId: string;
  tabViewId: string;
}
```

- Tracks active workspace/connection/schema
- Persists to IndexedDB/Electron
- Single source of truth for navigation state

#### 3. **Connection Management Store** (`managementConnectionStore`)

```typescript
interface Connection {
  id: string;
  workspaceId: string;
  name: string;
  connectionString: string;
  database: string;
  type: EDatabaseType;
  createdAt: string;
}
```

**Responsibilities:**

- Connection CRUD operations
- Connection grouping by workspace
- Connection health checks

#### 4. **Tab Views Store** (`useTabViewsStore`)

**Multi-tab interface management:**

```typescript
enum TabViewType {
  AllERD = 'AllERD',
  DetailERD = 'DetailERD',
  TableOverview = 'TableOverview',
  TableDetail = 'tableDetail',
  FunctionsOverview = 'FunctionsOverview',
  ViewOverview = 'ViewOverview',
  CodeQuery = 'CodeQuery',
}

interface TabView {
  workspaceId: string;
  connectionId: string;
  schemaId: string;
  id: string;
  index: number;
  name: string;
  icon: string;
  type: TabViewType;
  tableName?: string;
  routeName: RouteNameFromPath<RoutePathSchema>;
  routeParams?: Record<string, string | number>;
}
```

**Features:**

- Tab creation, removal, reordering
- Active tab tracking
- Persists tab state across sessions
- Drag-and-drop tab reordering

#### 5. **Schema Store** (`useSchemaStore`)

```typescript
interface Schema {
  id: string;
  name: string;
  tables: TableMetadata[];
}
```

**Responsibilities:**

- Schema metadata caching
- Reserved schemas tracking
- Current schema context

#### 6. **Activity Bar Store** (`useActivityBarStore`)

```typescript
enum ActivityBarItemType {
  Explorer = 'Explorer',
  Schemas = 'Schemas',
  ErdDiagram = 'ErdDiagram',
}
```

**Manages left sidebar state:**

- Active activity type
- Panel visibility

#### 7. **App Layout Store** (`appLayoutStore`)

**Global layout configuration:**

- Sidebar collapse states
- Panel sizes (resizable panels)
- Bottom panel visibility
- Right sidebar visibility

#### 8. **ERD Store** (`erdStore`)

- ERD diagram node positions
- Selected nodes
- Relationship visualization state

#### 9. **Explorer File Store** (`useExplorerFileStore`)

- SQL file management
- File tree structure
- File content caching

#### 10. **Quick Query Logs** (`useQuickQueryLogs`)

```typescript
interface QuickQueryLog {
  id: string;
  query: string;
  timestamp: string;
  connectionId: string;
  executionTime: number;
}
```

**Query history tracking:**

- Executed query logging
- Query reuse functionality

#### 11. **Management Explorer Store** (`managementExplorerStore`)

- Database object explorer state
- Expanded/collapsed tree nodes

### Data Flow Patterns

#### 1. **Component → Store → API → Database**

```
Component (UI)
  ↓ dispatch action
Store (Pinia)
  ↓ call API
Server Route (/server/api)
  ↓ query database
PostgreSQL
```

#### 2. **Local State vs Global State**

**Local State (component ref/reactive):**

- UI state (modal open/close)
- Form input values
- Temporary selections
- Component-specific flags

**Global State (Pinia stores):**

- Workspace/connection selection
- Tab management
- Schema metadata
- User preferences
- Query history

#### 3. **State Persistence**

```typescript
// Automatic persistence via plugin
const workspacesStore = useWorkspacesStore();

// Data is automatically saved to:
// - IndexedDB (web mode)
// - Electron local storage (desktop mode)

// Persistence configuration in store:
defineStore(
  'workspaces',
  () => {
    // ...
  },
  {
    persist: false, // Custom persistence via /shared/persist
  }
);
```

### State Hydration

```typescript
// On app initialization (app.vue)
onMounted(async () => {
  // Stores auto-load from persistence layer
  const workspaceId = route.params.workspaceId;
  const connectionId = route.params.connectionId;

  if (workspaceId && connectionId) {
    await connectToConnection({
      connId: connectionId,
      wsId: workspaceId,
      isRefresh: true,
    });
  }
});
```

---

## 7. API & Data Layer

### Server API Structure

Nuxt server routes in `/server/api`:

#### Database Query Execution

- **POST** `/api/execute` - Execute SQL query with timing
- **POST** `/api/raw-execute` - Execute raw SQL without formatting
- **POST** `/api/execute-bulk-update` - Bulk update rows
- **POST** `/api/execute-bulk-delete` - Bulk delete rows

#### Table Operations

- **POST** `/api/get-tables` - Get all tables metadata
- **POST** `/api/get-one-table` - Get single table detail
- **POST** `/api/get-over-view-tables` - Get tables overview
- **POST** `/api/get-table-structure` - Get table columns/constraints
- **POST** `/api/get-table-ddl` - Get table DDL statement
- **POST** `/api/get-table-size` - Get table disk size
- **POST** `/api/export-table-data` - Export table data (CSV/JSON)

#### View Operations

- **POST** `/api/get-over-view-views` - Get views overview
- **POST** `/api/get-view-definition` - Get view DDL

#### Function Operations

- **POST** `/api/get-over-view-function` - Get functions overview
- **POST** `/api/get-one-function` - Get function detail
- **POST** `/api/get-function-signature` - Get function signature
- **POST** `/api/update-function` - Update function definition
- **POST** `/api/delete-function` - Delete function
- **POST** `/api/rename-function` - Rename function

#### Schema Operations

- **POST** `/api/get-schema-meta-data` - Get schema metadata
- **POST** `/api/get-reverse-table-schemas` - Get reserved schemas

#### Connection Management

- **POST** `/api/managment-connection/health-check` - Test connection

#### AI Integration

- **POST** `/api/ai/chat` - AI chat for query generation

#### Monitoring

- **POST** `/api/getMetricMonitor` - Get database metrics

### Request/Response Patterns

#### Standard Query Execution

```typescript
// Request
{
  query: string;
  dbConnectionString: string;
}

// Response
{
  result: Record < string, unknown > [];
  queryTime: number; // milliseconds
}
```

#### Error Responses

```typescript
// H3 error format
{
  statusCode: 500,
  statusMessage: string,
  message: string,
  cause?: unknown,
  data?: unknown
}
```

### Database Connection Management

#### Connection Pooling

```typescript
// /server/utils/db-connection.ts
const connectionCache = new Map<string, CachedConnection>();
const LRU_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export const getDatabaseSource = async ({
  dbConnectionString,
  type,
}: {
  dbConnectionString: string;
  type: DatabaseType;
}) => {
  // Check cache
  const cached = connectionCache.get(dbConnectionString);
  if (cached?.source.isInitialized) {
    cached.lastUsed = Date.now();
    return cached.source;
  }

  // Create new connection
  const newSource = new DataSource({
    type: 'postgres',
    url: dbConnectionString,
    synchronize: false,
    logging: true,
    applicationName: 'orca-query-server',
  });

  await newSource.initialize();
  connectionCache.set(dbConnectionString, {
    source: newSource,
    lastUsed: Date.now(),
  });

  return newSource;
};
```

**Features:**

- Automatic connection pooling
- LRU cache eviction (5 min idle timeout)
- Connection reuse across requests
- Automatic cleanup on idle

### Error Handling

#### Client-Side Error Handling

```typescript
// /plugins/error-handler.ts
export default defineNuxtPlugin(nuxtApp => {
  nuxtApp.vueApp.config.errorHandler = (error, instance, info) => {
    console.log('🚀 ~ error:', { error, instance, info });
    // Future: Send to error tracking service
  };

  nuxtApp.hook('vue:error', (error, instance, info) => {
    // Global error handling
  });
});
```

#### API Error Handling

```typescript
// Example from /server/api/execute.ts
try {
  const result = await dataSource.query(body.query);
  return { result, queryTime };
} catch (error) {
  const queryError: QueryFailedError = error as QueryFailedError;

  throw createError({
    statusCode: 500,
    statusMessage: queryError.message,
    cause: queryError.cause,
    data: queryError.driverError,
    message: queryError.message,
  });
}
```

### Data Fetching Patterns

#### 1. **Composable-based Fetching**

```typescript
// From QuickQuery component
const { data, loading, error } = await useFetch('/api/get-tables', {
  method: 'POST',
  body: { dbConnectionString },
});
```

#### 2. **Direct $fetch**

```typescript
// From useAppContext
const databaseSource = await $fetch('/api/get-schema-meta-data', {
  method: 'POST',
  body: { dbConnectionString },
});
```

#### 3. **Streaming Responses**

For large data exports:

```typescript
// /composables/useStreamingDownload.ts
const response = await fetch('/api/export-table-data', {
  method: 'POST',
  body: JSON.stringify(payload),
});

const reader = response.body.getReader();
// Stream processing...
```

---

## 8. Key Components

### Core Reusable Components

#### 1. **BaseCodeEditor** (`/components/base/code-editor`)

**Full-featured SQL code editor:**

- CodeMirror 6 integration
- SQL syntax highlighting with multiple themes
- Auto-completion (tables, columns, keywords)
- SQL formatting (via sql-formatter)
- Multiple cursor support
- Minimap for navigation
- Line numbers and indentation markers
- Variable interpolation support

**Features:**

```vue
<BaseCodeEditor
  :modelValue="sqlQuery"
  :extensions="sqlExtensions"
  :placeholder="'Write SQL query...'"
  @update:modelValue="updateQuery"
  @cursorActivity="handleCursor"
/>
```

#### 2. **DynamicTable** (`/components/base/dynamic-table`)

**High-performance table component:**

- Virtual scrolling for millions of rows
- Column resizing, reordering
- Sorting, filtering
- Inline editing
- Row selection (single/multi/range)
- Context menu integration
- Export functionality

#### 3. **Tree Component** (`/components/base/Tree`)

**Hierarchical data visualization:**

- Lazy loading for large trees
- Drag-and-drop reordering
- Custom node rendering
- Keyboard navigation
- Search/filter
- Expand/collapse all

#### 4. **ContextMenu** (`/components/base/context-menu`)

**Right-click context menus:**

- Nested menu support
- Keyboard shortcuts display
- Icon support
- Conditional menu items
- Separator support

### Page-Level Components

#### 1. **QuickQuery** (`/components/modules/quick-query/QuickQuery.vue`)

**Interactive table browser (581 lines):**

**Sub-components:**

- `QuickQueryTable` - Main data grid (AG Grid)
- `QuickQueryFilter` - Advanced filtering UI
- `QuickQueryControlBar` - Toolbar with actions
- `PreviewSelectedRow` - Row detail view
- `PreviewRelationTable` - Foreign key navigation
- `StructureTable` - Table schema view
- `QuickQueryHistoryLogsPanel` - Query history
- `SafeModeConfirmDialog` - Confirmation for destructive actions

**Features:**

- Real-time table data browsing
- Advanced filtering (AND/OR operators, 15+ filter types)
- Inline editing with validation
- Bulk operations (update, delete, insert)
- Foreign key relationship navigation
- CSV/JSON export
- Query history
- Safe mode for preventing accidental deletes

**Composables used:**

- `useQuickQuery` - Data fetching and caching
- `useQuickQueryMutation` - CRUD operations
- `useQuickQueryTableInfo` - Table metadata
- `useReferencedTables` - Foreign key relationships
- `useTableQueryBuilder` - SQL query construction

#### 2. **RawQuery** (`/components/modules/raw-query/RawQuery.vue`)

**SQL editor interface (195 lines):**

**Sub-components:**

- `RawQueryLayout` - Layout wrapper
- `RawQueryEditorHeader` - Toolbar with execute, format
- `RawQueryEditorFooter` - Status bar with cursor info
- `RawQueryResultTabs` - Multiple result sets
- `VariableEditor` - Query variables panel
- `IntroRawQuery` - Welcome screen

**Features:**

- Multi-query execution
- Query result tabs
- Variable substitution (`${variableName}`)
- SQL formatting
- Syntax validation
- Query execution timing
- Connection selection
- File-based query storage

**Composables used:**

- `useRawQueryEditor` - Editor state and execution
- `useRawQueryFileContent` - File persistence

#### 3. **ManagementConnection** (`/components/modules/management-connection`)

**Connection CRUD interface:**

**Components:**

- `ManagementConnection.vue` - Main container
- `ConnectionsList.vue` - Connection list display
- `CreateConnectionModal.vue` - Form for connection details

**Features:**

- Add/edit/delete connections
- Connection testing
- Connection string validation
- Grouped by workspace

#### 4. **WorkspaceManagement** (`/components/modules/workspace`)

**Workspace selection and management:**

**Features:**

- Workspace creation wizard
- Workspace icons (30+ icons)
- Last opened sorting
- Workspace deletion

### Complex Business Components

#### 1. **ERD Diagram** (`/components/modules/erd-diagram`)

**Entity-relationship diagram renderer:**

**Technology:**

- Vue Flow for diagram rendering
- Auto-layout algorithm
- Interactive node dragging
- Relationship line routing

**Features:**

- Automatic table relationship detection
- Primary/foreign key visualization
- Zoom and pan
- Minimap navigation
- Export to PNG/SVG

#### 2. **TabViewContainer** (`/components/tab-view-container`)

**Multi-tab interface:**

**Components:**

- `TabViewContainer.vue` - Tab bar container
- `TabViews.vue` - Tab list
- `TabViewItem.vue` - Individual tab
- `TabViewItemPreview.vue` - Tab preview tooltip

**Features:**

- Drag-and-drop tab reordering (Pragmatic Drag & Drop)
- Tab close buttons
- Active tab highlighting
- Tab overflow scrolling
- Tab persistence

#### 3. **ActivityBar** (`/components/activity-bar`)

**Sidebar navigation:**

**Components:**

- `ActivityBar.vue` - Vertical activity bar
- `ActivityBarHorizontal.vue` - Horizontal variant
- `activityMenu.ts` - Menu configuration

**Activities:**

- Explorer (file/folder management)
- Schemas (database objects)
- ERD Diagram (visual schema)

---

## 9. Forms & Validation

### Form Libraries

- **vee-validate** (v4.15.0) - Form validation framework
- **@vee-validate/zod** (v4.15.0) - Zod schema integration
- **zod** (v4.3.5) - Schema validation

### Validation Strategy

#### 1. **Schema-First Validation**

```typescript
import { toTypedSchema } from '@vee-validate/zod';
import { useForm } from 'vee-validate';
import { z } from 'zod';

// Define Zod schema
const connectionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  connectionString: z.string().url('Invalid connection string'),
  database: z.string().min(1, 'Database is required'),
});

// Use in component
const { handleSubmit, errors } = useForm({
  validationSchema: toTypedSchema(connectionSchema),
});

const onSubmit = handleSubmit(values => {
  // Type-safe values
  createConnection(values);
});
```

#### 2. **Auto-Form Generation**

```vue
<!-- /components/ui/auto-form -->
<AutoForm :schema="connectionSchema" @submit="onSubmit" />
```

**Features:**

- Automatic form field generation from Zod schema
- Type-safe form handling
- Error message display
- Custom field components

#### 3. **Field-Level Validation**

```vue
<script setup lang="ts">
import { useField } from 'vee-validate';

const { value, errorMessage } = useField('email', {
  validate: val => {
    if (!val) return 'Email is required';
    if (!val.includes('@')) return 'Invalid email';
    return true;
  },
});
</script>

<template>
  <Input v-model="value" :error="errorMessage" />
</template>
```

### Common Form Patterns

#### Connection Form

```typescript
// Schema
const connectionSchema = z.object({
  name: z.string().min(1),
  host: z.string().min(1),
  port: z.number().min(1).max(65535),
  database: z.string().min(1),
  username: z.string().min(1),
  password: z.string().optional(),
  ssl: z.boolean().default(false),
});

// Form submission
const handleAddConnection = async (
  connection: z.infer<typeof connectionSchema>
) => {
  try {
    await createConnection({
      ...connection,
      id: uuidv4(),
      workspaceId: currentWorkspaceId,
      createdAt: new Date().toISOString(),
    });
    toast.success('Connection created successfully');
  } catch (error) {
    toast.error('Failed to create connection');
  }
};
```

---

## 10. Authentication & Authorization

### Current Implementation

**No Authentication System** - OrcaQ is a local-first desktop application.

### Security Model

- **Local-only**: All data stored locally (IndexedDB or Electron filesystem)
- **Direct DB Connections**: Users provide their own database credentials
- **No User Accounts**: No user registration or login

### Connection Security

```typescript
// Connections stored with encrypted credentials (Electron mode)
// Web mode: Uses browser's IndexedDB (limited security)

interface Connection {
  id: string;
  connectionString: string; // Contains password
  // Recommended: Use environment variables or secure vaults
}
```

### Future Considerations

- Credential encryption at rest
- OS keychain integration (macOS Keychain, Windows Credential Manager)
- SSH tunnel support for remote connections
- SSL/TLS certificate management

---

## 11. Configuration & Environment

### Environment Variables

#### Runtime Configuration

```typescript
// nuxt.config.ts
runtimeConfig: {
  public: {
    amplitudeApiKey: process.env.NUXT_AMPLITUDE_API_KEY,
  }
}
```

**Available Variables:**

- `NUXT_AMPLITUDE_API_KEY` - Analytics API key (optional)

### Build-Time Configuration

#### Nuxt Config (`nuxt.config.ts`)

```typescript
export default defineNuxtConfig({
  ssr: false, // SPA mode
  compatibilityDate: '2024-11-01',

  modules: [
    'shadcn-nuxt',
    '@nuxt/icon',
    '@nuxtjs/color-mode',
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt',
    'nuxt-typed-router',
    '@formkit/auto-animate',
  ],

  colorMode: {
    preference: 'light',
    fallback: 'light',
    storage: 'cookie',
  },

  vite: {
    plugins: [tailwindcss()],
  },
});
```

#### Tailwind Config (`tailwind.config.ts`)

```typescript
export default {
  theme: {
    extend: {
      fontFamily: {
        my: ['Chillax', 'sans-serif'],
      },
    },
  },
};
```

#### Shadcn UI Config (`components.json`)

```json
{
  "style": "new-york",
  "typescript": true,
  "tailwind": {
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

### TypeScript Configuration

#### Root Config (`tsconfig.json`)

```json
{
  "extends": "./.nuxt/tsconfig.json",
  "compilerOptions": {
    "useDefineForClassFields": true,
    "experimentalDecorators": true,
    "types": ["./electron/src/preload/index.d.ts"]
  }
}
```

### Application Settings

Stored in Pinia stores with persistence:

- Theme preference (light/dark)
- Layout sizes
- Editor preferences (font size, theme)
- Query execution timeout
- Auto-save interval

---

## 12. Performance Considerations

### Frontend Optimizations

#### 1. **Virtual Scrolling**

```typescript
// Large table rendering
import { useVirtualizer } from '@tanstack/vue-virtual';

const virtualizer = useVirtualizer({
  count: 1000000, // 1M rows
  getScrollElement: () => containerRef.value,
  estimateSize: () => 35, // Row height
  overscan: 5, // Render 5 extra rows
});
```

**Used in:**

- Quick Query table (AG Grid with virtual scrolling)
- Query result tables
- Database object trees

#### 2. **Code Splitting**

```typescript
// Lazy-loaded routes
defineAsyncComponent(
  () => import('~/components/modules/erd-diagram/ERDDiagram.vue')
);
```

**Benefits:**

- Reduced initial bundle size
- Faster first paint
- On-demand feature loading

#### 3. **Memoization**

```typescript
// Computed caching
const expensiveComputation = computed(() => {
  return heavyCalculation(data.value);
});

// Component memoization (avoided re-renders)
const MemoizedComponent = markRaw(defineComponent(/* ... */));
```

#### 4. **Debouncing User Input**

```typescript
// /composables/useHotKeys.ts
const DEFAULT_DEBOUNCE_INPUT = 300; // ms

// Search input debouncing
const debouncedSearch = useDebounceFn(query => {
  performSearch(query);
}, DEFAULT_DEBOUNCE_INPUT);
```

#### 5. **Connection Pooling (Server)**

```typescript
// Server-side connection caching
const connectionCache = new Map<string, CachedConnection>();
const LRU_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// Reuse connections for 5 minutes
// Automatic cleanup of idle connections
```

#### 6. **Streaming Large Data**

```typescript
// /composables/useStreamingDownload.ts
// Export large tables without blocking UI
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value, { stream: true });
  processChunk(chunk);
}
```

### Performance Monitoring

#### 1. **Amplitude Analytics**

```typescript
// /composables/useAmplitude.ts
const { trackEvent } = useAmplitude();

trackEvent('query_executed', {
  queryTime: 1234, // ms
  rowCount: 50000,
  operation: 'SELECT',
});
```

**Tracked Metrics:**

- Page views
- Query execution times
- Error rates
- Feature usage

#### 2. **Query Performance Tracking**

```typescript
// Server API timing
const startTime = performance.now();
const result = await dataSource.query(query);
const endTime = performance.now();
const queryTime = Number((endTime - startTime).toFixed(2));

return { result, queryTime };
```

### Performance Best Practices

#### ✅ Do:

- Use virtual scrolling for large lists
- Implement pagination for tables (100 rows default)
- Cache database metadata
- Debounce search and filter inputs
- Use `v-memo` for expensive list items
- Lazy load images and components
- Minimize watchers and computed properties

#### ❌ Don't:

- Render 10,000+ rows without virtualization
- Fetch entire tables without pagination
- Create new connections per query
- Use deep watchers on large objects
- Perform heavy computations in templates
- Forget to cleanup event listeners

---

## 13. Coding Conventions

### Naming Conventions

#### Files & Folders

```
PascalCase:     Components (QuickQuery.vue, BaseEmpty.vue)
kebab-case:     Folders (quick-query/, raw-query/)
camelCase:      TypeScript files (useAppContext.ts, activityMenu.ts)
```

#### Variables & Functions

```typescript
// camelCase for variables and functions
const connectionString = 'postgres://...';
const fetchTableData = async () => {
  /* ... */
};

// PascalCase for types and interfaces
interface Connection {
  /* ... */
}
type TabViewType = 'AllERD' | 'DetailERD';

// UPPER_SNAKE_CASE for constants
const DEFAULT_PAGE_SIZE = 100;
const LRU_TIMEOUT = 5 * 60 * 1000;
```

#### Component Names

```typescript
// Multi-word component names (Vue style guide)
✅ QuickQueryTable.vue
✅ RawQueryEditor.vue
✅ BaseEmpty.vue

❌ Query.vue (too generic)
❌ Editor.vue (too generic)
```

### Component Structure

#### Standard Component Template

```vue
<script setup lang="ts">
// 1. Imports
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';

// 2. Props & Emits
interface Props {
  tabViewId: string;
}
const props = defineProps<Props>();
const emit = defineEmits<{
  update: [value: string];
}>();

// 3. Composables & Stores
const route = useRoute();
const tabViewStore = useTabViewsStore();

// 4. Reactive State
const isLoading = ref(false);
const data = ref<TableData[]>([]);

// 5. Computed Properties
const filteredData = computed(() => {
  return data.value.filter(/* ... */);
});

// 6. Methods
const loadData = async () => {
  isLoading.value = true;
  try {
    data.value = await fetchData();
  } finally {
    isLoading.value = false;
  }
};

// 7. Lifecycle Hooks
onMounted(async () => {
  await loadData();
});

// 8. Watchers
watch(
  () => props.tabViewId,
  newId => {
    loadData();
  }
);
</script>

<template>
  <!-- Component template -->
</template>

<style scoped>
/* Component styles */
</style>
```

### TypeScript Patterns

#### 1. **Strict Typing**

```typescript
// Always type function parameters and returns
const createConnection = async (connection: Connection): Promise<void> => {
  // ...
};

// Use type inference for simple cases
const workspaces = ref<Workspace[]>([]);
const count = computed(() => workspaces.value.length); // Type inferred
```

#### 2. **Type Guards**

```typescript
// Type narrowing
const isConnection = (obj: unknown): obj is Connection => {
  return typeof obj === 'object' && obj !== null && 'connectionString' in obj;
};
```

#### 3. **Generics**

```typescript
// Reusable generic functions
const useDataFetcher = <T>(url: string, initialData: T) => {
  const data = ref<T>(initialData);
  // ...
  return { data };
};
```

### Composable Patterns

#### 1. **Composable Structure**

```typescript
// /composables/useTableActions.ts
export const useTableActions = ({ quickQueryTableRef }: TableActionsProps) => {
  // Local state
  const isLoading = ref(false);

  // Methods
  const deleteRows = async (rowIds: string[]) => {
    // ...
  };

  const updateRow = async (row: RowData) => {
    // ...
  };

  // Return public API
  return {
    isLoading: readonly(isLoading),
    deleteRows,
    updateRow,
  };
};
```

#### 2. **Composable Naming**

```
use[Feature][Type]
  - useTableActions
  - useQueryBuilder
  - useAmplitude
```

### Import Organization

```typescript
// 1. Vue core
import { ref, computed, onMounted } from 'vue';
// 2. Third-party libraries
import { useVirtualizer } from '@tanstack/vue-virtual';
import dayjs from 'dayjs';
// 4. Composables
import { useTableActions } from '~/composables/useTableActions';
// 5. Stores
import { useTabViewsStore } from '~/shared/stores';
// 6. Types
import type { TableData } from '~/shared/types';
// 7. Constants & utils
import { DEFAULT_PAGE_SIZE } from '~/utils/constants';
// 3. Components
import QuickQueryTable from './QuickQueryTable.vue';
```

### Comments & Documentation

```typescript
/**
 * Builds a SQL WHERE clause from filter schema
 * @param filters - Array of filter conditions
 * @param tableName - Name of the target table
 * @returns SQL WHERE clause string
 */
const buildWhereClause = (
  filters: FilterSchema[],
  tableName: string
): string => {
  // Implementation
};

// Inline comments for complex logic
// Step 1: Group filters by logical operator
const grouped = groupFilters(filters);

// Step 2: Build condition strings
const conditions = buildConditions(grouped);
```

---

## 14. Known Issues & Recommendations

### Current Limitations

#### 1. **Database Support**

**Issue:** Only PostgreSQL is supported  
**Recommendation:**

- Extend TypeORM configuration to support MySQL, SQLite, SQL Server
- Abstract database-specific SQL generation
- Add connection type selector in UI

#### 2. **Authentication**

**Issue:** No credential encryption at rest (web mode)  
**Recommendation:**

- Implement Web Crypto API for credential encryption
- Add master password feature
- Integrate with OS keychain for desktop mode

#### 3. **Large Result Sets**

**Issue:** Memory consumption with 1M+ row queries  
**Recommendation:**

- Implement server-side pagination
- Add streaming query results
- Warn users before executing large SELECT \* queries

#### 4. **Connection Pooling**

**Issue:** LRU cache may close connections prematurely  
**Recommendation:**

- Make timeout configurable per connection
- Add connection pool statistics monitoring
- Implement connection keep-alive pings

#### 5. **Error Handling**

**Issue:** Generic error messages  
**Recommendation:**

- Add SQL error code translation
- Provide actionable error suggestions
- Implement error reporting service integration

### Technical Debt

#### 1. **Component Size**

**Large Components:**

- `QuickQuery.vue` (581 lines)
- `RawQuery.vue` (195 lines)

**Recommendation:**

- Split into smaller sub-components
- Extract logic into composables
- Use slots for customization

#### 2. **Type Safety**

**Issue:** Some `@ts-ignore` comments in persistence layer  
**Location:** `/shared/persist/index.ts`

**Recommendation:**

- Add proper TypeScript declarations
- Create type definition files for window APIs
- Remove all `@ts-ignore` comments

#### 3. **Testing Coverage**

**Issue:** No test files found  
**Recommendation:**

- Add Vitest for unit testing
- Add Playwright for E2E testing (see `.github/instructions/playwright-typescript.instructions.md`)
- Target 80%+ coverage for critical paths

#### 4. **Accessibility**

**Issue:** Keyboard navigation incomplete  
**Recommendation:**

- Audit with axe-core
- Add ARIA labels to all interactive elements
- Implement focus management
- Support screen readers

#### 5. **Performance Monitoring**

**Issue:** No real-time performance metrics  
**Recommendation:**

- Add Web Vitals monitoring
- Track component render times
- Monitor memory usage
- Add performance budgets

### Security Considerations

#### 1. **SQL Injection Prevention**

✅ **Current:** Parameterized queries via TypeORM  
⚠️ **Risk:** Raw SQL editor allows arbitrary queries

**Recommendation:**

- Add SQL injection detection
- Warn users about dangerous queries (DROP, TRUNCATE)
- Implement query approval workflow for production connections

#### 2. **XSS Prevention**

✅ **Current:** Vue's built-in XSS protection  
⚠️ **Risk:** JSON pretty printer may render unsafe HTML

**Recommendation:**

- Sanitize all user-generated content
- Use `v-text` instead of `v-html` where possible
- Add CSP headers

#### 3. **Dependency Security**

**Recommendation:**

- Run `npm audit` regularly
- Keep dependencies up to date
- Use Dependabot for automated updates
- Monitor security advisories

### Scalability Recommendations

#### 1. **Code Organization**

```
Current:  Feature-based modules
Proposed: Domain-driven design with bounded contexts

/modules
  /query
    /quick-query
    /raw-query
  /schema
    /explorer
    /erd
  /workspace
    /connections
    /settings
```

#### 2. **State Management**

- Consider splitting large stores into smaller domains
- Implement store composition pattern
- Add store middleware for logging/analytics

#### 3. **Build Optimization**

```typescript
// Recommended Vite config additions
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-vue': ['vue', 'vue-router', 'pinia'],
          'vendor-ui': ['@tanstack/vue-table', 'ag-grid-vue3'],
          'vendor-editor': ['codemirror', '@codemirror/lang-sql'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
```

### Future Enhancements

#### High Priority

1. **Multi-database Support** (MySQL, SQLite, MongoDB)
2. **Collaboration Features** (share queries, team workspaces)
3. **Query Builder UI** (drag-and-drop query construction)
4. **Data Visualization** (charts from query results)
5. **Database Migrations** (version control for schema changes)

#### Medium Priority

6. **SQL Snippets** (reusable query templates)
7. **Schema Comparison** (diff between databases)
8. **Import Data** (CSV, JSON to table)
9. **Backup/Restore** (database backup tools)
10. **Performance Profiling** (EXPLAIN ANALYZE visualization)

#### Low Priority

11. **Dark Mode Themes** (multiple color schemes)
12. **Customizable Keyboard Shortcuts**
13. **Plugin System** (community extensions)
14. **Database Documentation Generator**
15. **AI Query Optimization** (suggest index improvements)

---

## 15. Development Workflow

### Getting Started

```bash
# Install dependencies
bun install

# Run web development server
npm run nuxt:dev

# Run Electron development
npm run dev

# Build for production (web)
npm run nuxt:build-web

# Build for production (desktop)
npm run app:build
```

### Code Quality Tools

```bash
# Type checking
npm run typecheck

# Formatting
npm run format        # Format all files
npm run format:check  # Check formatting

# Pre-commit hook (Husky)
# Automatically formats staged files
```

### Version Management

```bash
# Bump version
npm run version:patch  # 1.0.0 -> 1.0.1
npm run version:minor  # 1.0.0 -> 1.1.0
npm run version:major  # 1.0.0 -> 2.0.0

# Auto-syncs version across:
# - package.json
# - electron/package.json
# - Changelog
```

### Debugging

#### Vue Devtools

- Install Vue Devtools browser extension
- Inspect component state, props, events
- Track Pinia store mutations

#### Nuxt Devtools

```typescript
// Enabled in nuxt.config.ts
devtools: {
  enabled: true,
  timeline: { enabled: true }
}
```

#### Server-Side Debugging

```bash
# Node.js inspector
node --inspect server/api/execute.ts
```

---

## Summary

OrcaQ is a **sophisticated, production-ready database management application** built with modern web technologies. Its architecture demonstrates:

✅ **Solid Engineering:**

- Type-safe with TypeScript
- Modular, feature-based organization
- Efficient state management with Pinia
- Performance-optimized with virtual scrolling and lazy loading

✅ **User Experience:**

- Intuitive UI with Shadcn components
- Keyboard shortcut support
- Multi-tab interface
- Real-time query results

✅ **Extensibility:**

- Plugin-based architecture (Nuxt modules)
- Composable-driven design
- Clear separation of concerns

⚠️ **Areas for Improvement:**

- Test coverage (unit + E2E)
- Multi-database support
- Credential encryption
- Accessibility enhancements
- Performance monitoring

**Recommended Next Steps:**

1. Add comprehensive test suite (Vitest + Playwright)
2. Implement credential encryption
3. Add MySQL/SQLite support
4. Improve error handling and user feedback
5. Enhance accessibility (ARIA, keyboard navigation)

This documentation provides a comprehensive foundation for onboarding new developers, planning features, and maintaining code quality.

---

**Document Version:** 1.0  
**Last Updated:** February 2, 2026  
**Project Version:** 1.0.25
