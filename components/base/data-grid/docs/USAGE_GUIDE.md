# BaseDataGrid Usage Guide

`BaseDataGrid.vue` is the shared AG Grid shell for HeraQ. Use it when a screen
needs the standard grid behavior and only the row/column logic is feature-
specific.

## What BaseDataGrid Owns

- Grid API lifecycle and `gridReady`
- Theme synchronization
- Range-selection mouse wiring
- Selection and focus events
- Auto-scroll to the active selection/focused cell
- Cell and header context-menu event state
- Cmd/Ctrl+C copy hotkey for the focused cell
- Optional simple copy context menu

## What Callers Still Own

- `columnDefs`
- `rowData`
- Feature-specific `gridOptions`
- Custom renderers/editors/components
- Domain actions like save, delete, filter, relation preview, export flows

## Reusable Shared Pieces

- `BaseDataGrid.vue`: shared grid wrapper
- `BaseDataGridCopyContextMenu.vue`: simple built-in copy menu for generic grids
- `DataGridKeyHeader.vue`: shared PK/FK header renderer
- `DataGridRelationCell.vue`: shared relation-preview cell renderer
- `useDataGridAutoSizing()`: shared column auto-sizing helper
- `useDataGridSelection()`: shared selection/focus + auto-scroll behavior

If a renderer, editor, or header is used in more than one feature grid, move it
into `components/base/data-grid/` instead of leaving it inside a module.

## Direct Usage

Use `BaseDataGrid` directly when the screen only needs standard grid behavior.

```vue
<script setup lang="ts">
import {
  BaseDataGridCopyContextMenu,
  DataGridKeyHeader,
} from '~/components/base/data-grid';
import BaseDataGrid from '~/components/base/data-grid/BaseDataGrid.vue';

const rowData = computed(() => rows.value);
const columnDefs = computed(() => [
  {
    headerName: 'id',
    field: 'id',
    headerComponentParams: {
      innerHeaderComponent: DataGridKeyHeader,
      isPrimaryKey: true,
      isForeignKey: false,
    },
  },
]);
</script>

<template>
  <BaseDataGrid
    :column-defs="columnDefs"
    :row-data="rowData"
    context-menu-table-name="users"
    context-menu-schema-name="public"
    enable-simple-copy-context-menu
  />
</template>
```

## Props You Should Know

- `autoScrollOnSelection`: defaults to `true`; keeps the active selection in view
- `enableSimpleCopyContextMenu`: enables the built-in copy-only context menu
- `allowEditing`: defaults to `false`; pass `true` only from feature grids that
  own edit/save behavior, such as Quick Query or Raw Query
- `contextMenuTableName`: optional table name used by copy-row helpers
- `contextMenuSchemaName`: optional schema name used by copy-row helpers
- `columnTypes`: pass shared/editor styling types here instead of duplicating
  cell styles in the caller
- `components`: register custom AG Grid renderers/editors here

## When To Use An External Context Menu

Do **not** enable `enableSimpleCopyContextMenu` if the feature already wraps the
grid with a domain-specific menu like QuickQuery or RawQuery.

Use the exposed refs/events instead:

- `cellContextMenu`
- `cellHeaderContextMenu`
- `clearCellContextMenu()`
- `cellContextMenu` / `columnHeaderContextMenu` emits

That keeps `BaseDataGrid` generic while allowing modules to add feature actions
like relation preview, filter by value, save/delete, or exports.

## BaseDataGrid Checklist

- Build row data before passing it in; `BaseDataGrid` does not transform it
- Treat direct `BaseDataGrid` usage as view-only unless the screen has an
  explicit mutation flow and passes `allowEditing`
- Prefer shared renderers/headers from `components/base/data-grid/`
- Put generic AG Grid logic in `components/base/data-grid/`, not in a module
- Put feature-only grid behavior in the owning module
- Add focused tests when changing shared grid behavior because it affects many
  call sites
