# Quick Query Module Relationships

This document outlines the relationships and interactions between the `QuickQuery` module, `ManagementSchemas`, and core stores.

## Overview

The **Quick Query** module is the central interface for interacting with database tables and views. It is tightly integrated with the `ManagementSchemas` module (for navigation) and `useTabViewsStore` (for state management).

## Module Interactions

### 1. Navigation Flow

**`ManagementSchemas` -> `useTabViewsStore` -> `QuickQuery Page` -> `QuickQuery Component`**

1.  **User Action**: User clicks a table or view in the `ManagementSchemas` file tree.
2.  **Trigger**: `handleTreeClick` calls `tabViewStore.openTab()`.
3.  **State Update**: `useTabViewsStore` adds a new `TabView` object and sets the active `tabViewId`.
4.  **Routing**: The application navigates to `/workspace/:id/connection/:id/quick-query/:tabViewId`.
5.  **Rendering**:
    - The page `[tabViewId].vue` renders `QuickQuery.vue`, passing the `tabViewId` as a prop.
    - `QuickQuery.vue` retrieves the tab context (schema, table name) from `useTabViewsStore` using the ID.

### 2. State Management

| Store                  | Role in Quick Query                                                                                                               |
| :--------------------- | :-------------------------------------------------------------------------------------------------------------------------------- |
| **`useTabViewsStore`** | **Primary Source of Truth**. Stores the list of open tabs, their metadata (table name, schema name, type), and the active tab ID. |
| **`useWSStateStore`**  | Manages the global workspace and connection context. Used by `QuickQuery` to know _which_ database to query.                      |
| **`appLayoutStore`**   | Controls UI panels (e.g., toggling the history logs bottom panel).                                                                |

### 3. Component Hierarchy

- **`QuickQuery.vue`** (Container)
  - **`QuickQueryControlBar`**: Pagination, refresh, save/delete actions.
  - **`QuickQueryFilter`**: Advanced filtering UI.
  - **`QuickQueryTable`**: The data grid (likely using AG Grid or similar).
    - **`QuickQueryContextMenu`**: Right-click actions on rows/cells.
  - **`StructureTable`**: Displays table schema/structure (tabs view).
  - **`WrapperErdDiagram`**: Displays ERD for the table.

## Key Dependencies

- **Composables**:
  - `useTableQueryBuilder`: Handles SQL query generation, pagination, and data fetching.
  - `useQuickQueryMutation`: Handles INSERT/UPDATE/DELETE operations.
  - `useQuickQueryTableInfo`: Fetches metadata (columns, primary keys).
- **Teleports**:
  - `QuickQueryTableSummary` -> Header area (detected by `#preview-select-row`).
  - `QuickQueryHistoryLogsPanel` -> Bottom panel (detected by `#bottom-panel`).

## Diagram

```mermaid
graph TD
    User[User] -->|Click Table| ManagementSchemas
    ManagementSchemas -->|openTab| TabViewsStore
    TabViewsStore -->|Navigate| QuickQueryPage
    QuickQueryPage -->|Props: tabViewId| QuickQuery
    QuickQuery -->|Get Context| TabViewsStore
    QuickQuery -->|Fetch Data| TableQueryBuilder
    TableQueryBuilder -->|SQL| Database API
```
