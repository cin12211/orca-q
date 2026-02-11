# OrcaQ Module Flows

**Version:** 1.0  
**Last Updated:** February 2026

Detailed business flows for each major module with sequence diagrams.

---

## Table of Contents

1. [Quick Query Module](#1-quick-query-module)
2. [Raw Query Module](#2-raw-query-module)
3. [Management Schemas Module](#3-management-schemas-module)
4. [ERD Diagram Module](#4-erd-diagram-module)
5. [Connection Management](#5-connection-management)
6. [Workspace Management](#6-workspace-management)
7. [Application Initialization](#7-application-initialization)

---

## 1. Quick Query Module

### Overview

Interactive table data browsing with filtering, pagination, inline editing, and CRUD operations.

**Location:** `/components/modules/quick-query/`

### Data Loading Flow

```mermaid
sequenceDiagram
    participant U as User
    participant QQ as QuickQuery.vue
    participant Hook as useTableQueryBuilder
    participant API as Server API
    participant DB as PostgreSQL

    U->>QQ: Open table tab
    QQ->>Hook: Initialize with table/schema
    Hook->>API: POST /api/get-one-table
    API->>DB: Query table metadata
    DB-->>API: Column types, constraints
    API-->>Hook: Table metadata
    Hook->>API: POST /api/execute (SELECT)
    API->>DB: Execute SELECT query
    DB-->>API: Row data
    API-->>Hook: Data + query time
    Hook-->>QQ: Display in AG Grid
    QQ-->>U: Table rendered
```

### Filter & Pagination Flow

```mermaid
sequenceDiagram
    participant U as User
    participant Filter as QuickQueryFilter
    participant Hook as useTableQueryBuilder
    participant API as Server API

    U->>Filter: Add filter conditions
    Filter->>Hook: Update filters array
    Hook->>Hook: Build WHERE clause
    Hook->>API: POST /api/execute (filtered)
    API-->>Hook: Filtered results

    U->>Filter: Change pagination
    Hook->>Hook: Update LIMIT/OFFSET
    Hook->>API: POST /api/execute
    API-->>Hook: Page results
```

### CRUD Operations Flow

```mermaid
sequenceDiagram
    participant U as User
    participant QQ as QuickQuery
    participant Mutation as useQuickQueryMutation
    participant Dialog as SafeModeConfirmDialog
    participant API as Server API

    Note over U,API: ADD ROW
    U->>QQ: Click Add Row
    QQ->>Mutation: onAddEmptyRow()
    Mutation-->>QQ: New row in local state

    Note over U,API: EDIT CELL
    U->>QQ: Edit cell value
    QQ->>Mutation: Track edited row

    Note over U,API: SAVE (with Safe Mode)
    U->>QQ: Press Cmd+S or Save
    QQ->>Mutation: onSaveData()
    Mutation->>Mutation: Generate SQL
    alt Safe Mode Enabled
        Mutation->>Dialog: Show SQL preview
        U->>Dialog: Confirm
    end
    Mutation->>API: POST /api/execute-bulk-update
    API-->>Mutation: Success
    Mutation->>Mutation: addHistoryLog()

    Note over U,API: DELETE
    U->>QQ: Select rows, Delete
    QQ->>Mutation: onDeleteRows()
    alt Safe Mode Enabled
        Mutation->>Dialog: Show DELETE SQL
        U->>Dialog: Confirm
    end
    Mutation->>API: POST /api/execute-bulk-delete
    API-->>Mutation: Success
```

### Key Hooks

| Hook                     | Purpose                                            |
| ------------------------ | -------------------------------------------------- |
| `useQuickQuery`          | Shared refs (table ref, filter ref, selected rows) |
| `useQuickQueryMutation`  | CRUD operations, history logging                   |
| `useQuickQueryTableInfo` | Table metadata loading                             |
| `useTableQueryBuilder`   | SQL query construction                             |

---

## 2. Raw Query Module

### Overview

Full-featured SQL editor with syntax highlighting, multiple result tabs, and variable substitution.

**Location:** `/components/modules/raw-query/`

### Query Execution Flow

```mermaid
sequenceDiagram
    participant U as User
    participant RQ as RawQuery.vue
    participant Editor as BaseCodeEditor
    participant Hook as useRawQueryEditor
    participant API as Server API
    participant DB as PostgreSQL

    U->>Editor: Write SQL query
    Editor->>Hook: updateFileContent()
    U->>RQ: Press Cmd+Enter or Execute
    RQ->>Hook: onExecuteCurrent()
    Hook->>Hook: Parse SQL (get current statement)
    Hook->>Hook: Substitute variables
    Hook->>API: POST /api/raw-execute
    API->>DB: Execute query
    DB-->>API: Results or error
    API-->>Hook: Response
    Hook->>Hook: Create new result tab
    Hook-->>RQ: Display results
    RQ-->>U: Show in result panel
```

### Multi-Result Management

```mermaid
stateDiagram-v2
    [*] --> Empty: Initial state
    Empty --> OneResult: Execute query
    OneResult --> MultiResult: Execute another
    MultiResult --> MultiResult: Execute more
    MultiResult --> OneResult: Close tabs
    OneResult --> Empty: Close all

    state MultiResult {
        Tab1 --> Tab2: Select
        Tab2 --> Tab3: Select
        Tab3 --> Tab1: Select
    }
```

### File Content Persistence

```mermaid
sequenceDiagram
    participant RQ as RawQuery
    participant Hook as useRawQueryFileContent
    participant Store as ExplorerFileStore
    participant Persist as IndexedDB

    Note over RQ,Persist: On Content Change
    RQ->>Hook: updateFileContent(content)
    Hook->>Store: Update file
    Store->>Persist: window.rowQueryFileApi.update()

    Note over RQ,Persist: On Tab Reopen
    RQ->>Hook: onMounted()
    Hook->>Persist: window.rowQueryFileApi.getById()
    Persist-->>Hook: File content + cursor pos
    Hook-->>RQ: Restore editor state
```

---

## 3. Management Schemas Module

### Overview

Schema explorer tree with context menu actions for tables, views, and functions.

**Location:** `/components/modules/management-schemas/`

### Schema Tree Loading

```mermaid
sequenceDiagram
    participant U as User
    participant MS as ManagementSchemas
    participant Context as useAppContext
    participant Store as SchemaStore
    participant API as Server API

    U->>MS: Connect to database
    MS->>Context: connectToConnection()
    Context->>API: POST /api/get-schema-meta-data
    API-->>Context: All schemas with tables
    Context->>Store: Update schemas array
    Store-->>MS: Reactive update
    MS-->>U: Render tree view
```

### Context Menu Actions

```mermaid
flowchart TD
    A[Right-click item] --> B{Item Type?}

    B -->|Table| C[Table Menu]
    C --> C1[Select Top 100]
    C --> C2[Refresh Table]
    C --> C3[Rename Table]
    C --> C4[Delete Table]
    C --> C5[Export Data]
    C --> C6[Copy SQL]

    B -->|Function| D[Function Menu]
    D --> D1[Execute Function]
    D --> D2[Rename Function]
    D --> D3[Delete Function]
    D --> D4[Copy Definition]

    B -->|View| E[View Menu]
    E --> E1[Query View]
    E --> E2[Copy Definition]

    B -->|Schema| F[Schema Menu]
    F --> F1[Refresh Schema]
    F --> F2[Create Table]
```

### Table Operations

| Action         | API Endpoint                | Result                |
| -------------- | --------------------------- | --------------------- |
| Select Top 100 | `/api/execute`              | Opens Quick Query tab |
| Refresh        | `/api/get-schema-meta-data` | Updates tree          |
| Rename         | `/api/execute` (ALTER)      | Updates tree          |
| Delete         | `/api/execute` (DROP)       | Removes from tree     |
| Export         | `/api/export-table-data`    | Downloads file        |

---

## 4. ERD Diagram Module

### Overview

Visual entity-relationship diagram using Vue Flow for interactive database schema visualization.

**Location:** `/components/modules/erd-diagram/`

### Diagram Generation Flow

```mermaid
sequenceDiagram
    participant U as User
    participant ERD as ErdDiagram
    participant Hook as useErdDiagram
    participant Store as SchemaStore
    participant VueFlow as Vue Flow

    U->>ERD: Open ERD tab
    ERD->>Hook: Initialize
    Hook->>Store: Get tables + relationships
    Hook->>Hook: Generate nodes
    Hook->>Hook: Generate edges (FK relations)
    Hook->>Hook: Apply auto-layout
    Hook->>VueFlow: setNodes() + setEdges()
    VueFlow-->>ERD: Render diagram
    ERD-->>U: Interactive diagram
```

### Node Interactions

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Selected: Click node
    Selected --> Dragging: Drag
    Dragging --> Released: Drop
    Released --> Idle
    Selected --> Expanded: Reveal relations
    Expanded --> Idle: Clear selection
```

### ERD Node Structure

```typescript
interface ErdNode {
  id: string; // table_oid
  type: 'custom'; // Custom ValueNode
  position: { x; y }; // Coordinates
  data: {
    tableName: string;
    schemaName: string;
    columns: Column[];
    primaryKeys: string[];
    foreignKeys: ForeignKey[];
  };
}
```

---

## 5. Connection Management

### Create Connection Flow

```mermaid
sequenceDiagram
    participant U as User
    participant Modal as CreateConnectionModal
    participant Store as ConnectionStore
    participant API as Server API
    participant Persist as IndexedDB

    U->>Modal: Fill connection form
    U->>Modal: Click Test Connection
    Modal->>API: POST /api/managment-connection/health-check
    API-->>Modal: Connection OK / Error

    U->>Modal: Click Save
    Modal->>Store: createNewConnection()
    Store->>Persist: window.connectionApi.create()
    Store-->>Modal: Success
    Modal-->>U: Close modal
```

### Connection String Parsing

```typescript
// Input: postgresql://user:pass@localhost:5432/mydb
// Parsed:
{
  host: 'localhost',
  port: 5432,
  database: 'mydb',
  username: 'user',
  password: 'pass'
}
```

---

## 6. Workspace Management

### Workspace Selection Flow

```mermaid
sequenceDiagram
    participant U as User
    participant Home as /pages/index
    participant Store as WorkspacesStore
    participant Persist as IndexedDB

    U->>Home: Open app
    Home->>Store: loadWorkspaces()
    Store->>Persist: window.workspaceApi.getAll()
    Persist-->>Store: Workspaces list
    Store-->>Home: Render cards

    U->>Home: Select workspace
    Home->>Store: updateLastOpened()
    Home->>Home: navigateTo workspace
```

### State Restoration

```mermaid
flowchart TD
    A[App Opens] --> B[Load Workspaces]
    B --> C{Has last workspace?}
    C -->|Yes| D[Load WS State]
    C -->|No| E[Show workspace list]
    D --> F{Has connection?}
    F -->|Yes| G[Connect to DB]
    F -->|No| H[Show connection list]
    G --> I{Has tabs?}
    I -->|Yes| J[Restore tabs]
    I -->|No| K[Show empty state]
    J --> L[Navigate to last tab]
```

---

## 7. Application Initialization

### Full Initialization Flow

```mermaid
sequenceDiagram
    participant App as app.vue
    participant Router as Nuxt Router
    participant Stores as Pinia Stores
    participant Context as useAppContext
    participant Persist as Persistence Layer
    participant API as Server API

    Note over App,API: App Startup
    App->>Stores: Initialize stores
    Stores->>Persist: Load persisted data
    Persist-->>Stores: Workspaces, Connections, Tabs

    App->>Router: Check current route
    alt Has workspaceId + connectionId
        Router->>Context: connectToConnection()
        Context->>API: Fetch schema metadata
        API-->>Context: Schemas with tables
        Context->>Stores: Update schema store
        Context->>Router: Navigate to last tab
    else No route params
        Router->>App: Stay on home page
    end
```

---

## Cross-Module Communication

```mermaid
flowchart LR
    subgraph "UI Layer"
        A[QuickQuery]
        B[RawQuery]
        C[ManagementSchemas]
        D[ErdDiagram]
    end

    subgraph "State Layer"
        E[useTabViewsStore]
        F[useSchemaStore]
        G[useWSStateStore]
    end

    subgraph "Persistence"
        H[(IndexedDB)]
    end

    A --> E
    B --> E
    C --> F
    D --> F

    E --> G
    F --> G

    G --> H
    E --> H
```

---

## Module Quick Reference

| Module      | Entry Component            | Main Hook               | Store Dependency       |
| ----------- | -------------------------- | ----------------------- | ---------------------- |
| Quick Query | `QuickQuery.vue`           | `useQuickQueryMutation` | TabViews, Schema       |
| Raw Query   | `RawQuery.vue`             | `useRawQueryEditor`     | TabViews, ExplorerFile |
| Schemas     | `ManagementSchemas.vue`    | `useSchemaContextMenu`  | Schema, WSState        |
| ERD         | `ErdDiagram.vue`           | `useErdDiagram`         | ERD, Schema            |
| Connection  | `ManagementConnection.vue` | -                       | Connection             |
| Workspace   | `WorkspaceList.vue`        | -                       | Workspaces             |
