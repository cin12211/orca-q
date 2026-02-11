# OrcaQ Business Rules

**Version:** 1.0  
**Last Updated:** February 2026

Business logic, data validation rules, constraints, and state management patterns.

---

## 1. Workspace Rules

### Creation

- **Required fields:** `name`, `icon`
- **Auto-generated:** `id` (UUID), `createdAt` timestamp
- **Optional:** `desc` (description)

### Behavior

- Workspace must have at least one connection to be functional
- `lastOpened` updated on each workspace access
- Deleting workspace cascades to all associated connections and state

### State Storage

```typescript
interface Workspace {
  id: string; // UUID
  name: string; // Required
  icon: string; // Emoji or icon name
  desc?: string; // Optional description
  createdAt: string; // ISO timestamp
  updatedAt?: string; // ISO timestamp
  lastOpened?: string; // ISO timestamp
}
```

---

## 2. Connection Rules

### Connection String Requirements

- Must be a valid PostgreSQL connection string
- Format: `postgresql://user:password@host:port/database`
- Validated before save

### Health Check

- Health check performed on connection test
- Failed connections show error but are still saved
- Connection status is not persisted (checked on-demand)

### Per-Workspace Isolation

- Connections belong to exactly one workspace
- Connection `workspaceId` is immutable after creation
- Deleting connection removes all associated tabs and state

### State

```typescript
interface Connection {
  id: string; // UUID
  workspaceId: string; // Parent workspace
  name: string; // Display name
  connectionString: string; // PostgreSQL URL
  database: string; // Database name (parsed)
  type: EDatabaseType; // 'postgres' | 'mysql'
  createdAt: string; // ISO timestamp
}
```

---

## 3. Schema Rules

### Default Schema

- If `public` schema exists, it's selected by default
- Otherwise, first schema in list is selected
- Schema selection persists per connection

### Reserved Schemas

- Reserved schemas fetched separately via `/api/get-reverse-table-schemas`
- Used for reference/lookup, not direct modification

### Schema Metadata Caching

- Schema metadata cached in Pinia store
- Cache invalidated on:
  - Manual refresh
  - Connection re-establishment
  - DDL operations (create/drop table)

---

## 4. Tab View Rules

### Tab Types

```typescript
enum TabViewType {
  AllERD = 'AllERD', // Full ERD diagram
  DetailERD = 'DetailERD', // Single table ERD
  TableOverview = 'TableOverview', // Tables list
  TableDetail = 'tableDetail', // Table structure
  FunctionsOverview = 'FunctionsOverview',
  FunctionsDetail = 'FunctionsDetail',
  ViewOverview = 'ViewOverview',
  ViewDetail = 'ViewDetail',
  CodeQuery = 'CodeQuery', // SQL file editor
  UserPermissions = 'UserPermissions',
}
```

### Tab Behavior

- **ID:** Composite of `schemaId` + `tableName` for uniqueness
- **Deduplication:** Opening existing tab focuses it (no duplicates)
- **Persistence:** All tabs persist to IndexedDB/Electron storage
- **Close behavior:**
  - Closing active tab selects next tab (or previous if last)
  - Closing all tabs navigates to connection home

### Tab Operations

| Action         | Behavior                            |
| -------------- | ----------------------------------- |
| Open           | Creates new tab or focuses existing |
| Close          | Removes tab, selects adjacent       |
| Close Others   | Keeps only selected tab             |
| Close to Right | Closes all tabs after selected      |
| Reorder        | Drag-and-drop supported             |

---

## 5. Query Execution Rules

### Safe Mode

When `quickQuerySafeModeEnabled` is true:

- **Save operations** show SQL preview dialog before execution
- **Delete operations** show SQL preview dialog before execution
- User must explicitly confirm to proceed

### Query Logging

All executed queries are logged with:

- Query text
- Execution timestamp
- Duration (ms)
- Connection ID
- Error status (success/failure)

### Error Handling

```typescript
interface QueryError {
  message: string; // User-friendly message
  detail?: string; // PostgreSQL error detail
  position?: number; // Character position in query
  hint?: string; // PostgreSQL hint
}
```

---

## 6. Data Mutation Rules

### Quick Query CRUD

#### Add Row

1. New row added to local state with empty values
2. On save, generates INSERT statement
3. Primary key auto-generated if sequence exists

#### Edit Cell

1. Cell value updated in local state
2. Tracks original vs modified values
3. On save, generates UPDATE for changed rows only

#### Delete Rows

1. Selected rows marked for deletion
2. On confirm, generates DELETE statement
3. Bulk delete via single transaction

### Validation

- **Primary Key:** Required for UPDATE/DELETE operations
- **Not Null:** Enforced by database constraints
- **Foreign Keys:** Checked on save (database-level)

---

## 7. State Persistence Rules

### What Persists

| Data          | Storage      | Cleared On        |
| ------------- | ------------ | ----------------- |
| Workspaces    | IndexedDB    | Manual delete     |
| Connections   | IndexedDB    | Workspace delete  |
| Tab views     | IndexedDB    | Connection delete |
| Query logs    | IndexedDB    | Manual clear      |
| SQL files     | IndexedDB    | Manual delete     |
| Layout sizes  | localStorage | Never             |
| Editor config | localStorage | Never             |
| AI API keys   | localStorage | Manual clear      |

### Persistence Layer

- **Web mode:** Uses `localforage` (IndexedDB wrapper)
- **Desktop mode:** Uses Electron IPC to filesystem
- Unified API via `/shared/persist/` abstractions

### State Hydration

On app load:

1. Load workspaces from persist
2. Restore last selected workspace/connection
3. Load tab views for current context
4. Re-fetch schema metadata from database

---

## 8. Navigation Rules

### Route Parameters

| Parameter      | Requirement                        |
| -------------- | ---------------------------------- |
| `workspaceId`  | Must exist in workspaces store     |
| `connectionId` | Must belong to workspace           |
| `schemaId`     | Must exist in connection's schemas |
| `tabViewId`    | Must exist in tab views store      |

### Invalid Route Handling

- Invalid workspace → Redirect to home
- Invalid connection → Redirect to workspace home
- Invalid tab → Redirect to connection home

---

## 9. AI Integration Rules

### Provider Configuration

```typescript
type AIProvider = 'openai' | 'google' | 'anthropic' | 'xai';
```

### API Key Storage

- Stored in localStorage (persisted)
- Never sent to backend (client-side only)
- Must be provided before AI features work

### Rate Limits

- Handled by respective provider SDKs
- Errors shown to user with provider-specific messages

---

## 10. Export Rules

### Supported Formats

| Format       | Extension | MIME Type        |
| ------------ | --------- | ---------------- |
| CSV          | .csv      | text/csv         |
| JSON         | .json     | application/json |
| SQL (INSERT) | .sql      | application/sql  |

### Export Behavior

- Streaming for large datasets
- Respects current filter/sort
- Includes/excludes columns based on selection

### SQL Export Options

- Bulk INSERT mode (efficient)
- Individual INSERT statements (portable)
- Table DDL included optionally

---

## State Management Summary

```mermaid
graph TD
    subgraph "Global State (Pinia)"
        A[useWorkspacesStore]
        B[managementConnectionStore]
        C[useWSStateStore]
        D[useSchemaStore]
        E[useTabViewsStore]
        F[appLayoutStore]
    end

    subgraph "Persistence"
        G[(IndexedDB)]
        H[(localStorage)]
    end

    A --> G
    B --> G
    C --> G
    D --> |Cache only| Memory
    E --> G
    F --> H
```

---

## Business Rules Quick Reference

| Rule              | Constraint                             |
| ----------------- | -------------------------------------- |
| Workspace name    | Required, non-empty                    |
| Connection string | Valid PostgreSQL URL                   |
| Tab uniqueness    | One tab per table/schema combo         |
| Query execution   | Must have valid connection             |
| Data mutation     | Requires primary key for UPDATE/DELETE |
| Safe mode         | Optional confirmation before mutations |
| Export            | Streaming for datasets > 10K rows      |
