---
name: primary-sidebar
description: Complete guide for adding, updating, and removing tabs in the Primary Sidebar of OrcaQ. Covers the full flow — ActivityBarItemType enum → useActivityBarStore → PrimarySideBar component → Management panel component. Load this skill for any task involving the left sidebar, activity bar tabs, or management panels (Explorer, Schemas, ERD, Roles, Export, Agent).
---

# Primary Sidebar Flow — OrcaQ

## Architecture Overview

The Primary Sidebar is driven by a single active tab value in a Pinia store. The flow is:

```
ActivityBarItemType (enum)           ← Tab identity
useActivityBarStore.activityActive   ← Which tab is currently active (persisted)
PrimarySideBar.vue                   ← Watches activityActive, renders the matching component
Management***.vue                    ← The actual panel content (KeepAlive'd)
```

The Activity Bar (the narrow icon strip on the far left) calls `setActivityActive(type)`. The Primary Sidebar reacts to the change and swaps the rendered panel — all panels are wrapped in `<KeepAlive>` so their state is preserved when the user switches tabs.

---

## File Locations

| Purpose                  | File                                                                          |
| ------------------------ | ----------------------------------------------------------------------------- |
| Tab type enum + store    | `core/stores/useActivityBarStore.ts`                                          |
| Sidebar shell (switcher) | `components/modules/app-shell/primary-side-bar/components/PrimarySideBar.vue` |
| Sidebar public API       | `components/modules/app-shell/primary-side-bar/index.ts`                      |
| All management panels    | `components/modules/management/`                                              |
| Management public API    | `components/modules/management/index.ts`                                      |
| Shared header component  | `components/modules/management/shared/components/ManagementSidebarHeader.vue` |

### Management panel locations

| Tab           | Panel component file                                                             |
| ------------- | -------------------------------------------------------------------------------- |
| Explorer      | `components/modules/management/explorer/ManagementExplorer.vue`                  |
| Schemas       | `components/modules/management/schemas/ManagementSchemas.vue`                    |
| ERD Diagram   | `components/modules/management/erd-diagram/ManagementErdDiagram.vue`             |
| Users & Roles | `components/modules/management/role-permission/ManagementUsersAndPermission.vue` |
| Export        | `components/modules/management/export/ManagementExport.vue`                      |
| Agent         | `components/modules/management/agent/ManagementAgent.vue`                        |

---

## How the Switcher Works (`PrimarySideBar.vue`)

```vue
<script setup lang="ts">
const activityStore = useActivityBarStore();
const current = shallowRef();

watch(
  () => activityStore.activityActive,
  () => {
    if (activityStore.activityActive === ActivityBarItemType.Explorer)
      current.value = ManagementExplorer;
    if (activityStore.activityActive === ActivityBarItemType.Schemas)
      current.value = ManagementSchemas;
    // ... one branch per tab
  },
  { immediate: true }
);
</script>

<template>
  <div class="w-full h-full flex flex-col" v-if="appConfigStore.layoutSize[0]">
    <KeepAlive>
      <component :is="current" />
    </KeepAlive>
  </div>
</template>
```

Key points:

- Uses `shallowRef` (not `ref`) for the component — avoids deep reactivity on component objects.
- `immediate: true` so the correct panel is rendered on first mount.
- `<KeepAlive>` preserves scroll position and internal state when switching tabs.
- The panel is only mounted when the sidebar is open (`layoutSize[0] > 0`).

---

## How to Add a New Sidebar Tab

### Step 1 — Add enum value

In `core/stores/useActivityBarStore.ts`:

```ts
export enum ActivityBarItemType {
  Explorer = 'Explorer',
  Schemas = 'Schemas',
  ErdDiagram = 'ERDiagram',
  UsersRoles = 'UsersRoles',
  DatabaseExport = 'DatabaseExport',
  Agent = 'Agent',
  MyNewTab = 'MyNewTab', // ← new
}
```

### Step 2 — Create the management panel module

Create the folder `components/modules/management/my-new-tab/` with this structure:

```
my-new-tab/
├── index.ts                    ← exports ManagementMyNewTab
├── ManagementMyNewTab.vue      ← entry component
├── components/                 ← sub-components (optional)
├── hooks/                      ← business logic composables (optional)
└── services/                   ← API calls (optional)
```

**`ManagementMyNewTab.vue`** minimum template:

```vue
<script setup lang="ts">
import { ManagementSidebarHeader } from '../shared';
</script>

<template>
  <div class="flex flex-col h-full w-full overflow-y-auto">
    <ManagementSidebarHeader title="My New Tab" />
    <!-- panel content here -->
  </div>
</template>
```

**`index.ts`**:

```ts
export { default as ManagementMyNewTab } from './ManagementMyNewTab.vue';
```

### Step 3 — Export from the management module

In `components/modules/management/index.ts`:

```ts
export * from './my-new-tab'; // ← add this line
```

### Step 4 — Register in PrimarySideBar

In `components/modules/app-shell/primary-side-bar/components/PrimarySideBar.vue`:

```ts
// 1. Import the component
import { ManagementMyNewTab } from '#components';

// 2. Add a branch in the watch
watch(
  () => activityStore.activityActive,
  () => {
    // ... existing branches ...
    if (activityStore.activityActive === ActivityBarItemType.MyNewTab)
      current.value = ManagementMyNewTab;
  },
  { immediate: true }
);
```

### Step 5 — Add Activity Bar button

The Activity Bar icon strip that calls `setActivityActive` is separate from the management module. Find the component that renders the icon list and add a button:

```ts
activityStore.setActivityActive(ActivityBarItemType.MyNewTab);
```

---

## How to Update an Existing Panel

1. **Find the panel** in `components/modules/management/<tab-name>/Management<Tab>.vue`.
2. **Business logic** (API calls, state) belongs in a hook under `<tab-name>/hooks/`.
3. **Static structure** (sub-components) belongs in `<tab-name>/components/`.
4. **Persisted UI state** (expanded nodes, scroll position) goes into `useActivityBarStore` — see `schemasExpandedState`, `schemaCurrentScrollTop` as examples.

---

## ManagementSidebarHeader — Shared Header Component

All panels use the shared header. Props:

| Prop                | Type      | Default       | Purpose                                |
| ------------------- | --------- | ------------- | -------------------------------------- |
| `title`             | `string`  | required      | Panel title text                       |
| `showConnection`    | `boolean` | `false`       | Show ConnectionSelector dropdown       |
| `showSchema`        | `boolean` | `false`       | Show SchemaSelector dropdown           |
| `workspaceId`       | `string`  | —             | Required when `showConnection` is true |
| `showSearch`        | `boolean` | `false`       | Show search input                      |
| `searchPlaceholder` | `string`  | `'Search...'` | Input placeholder                      |

It also accepts a `v-model:search` for two-way search binding and an `#actions` slot for icon buttons in the title bar.

**Standard usage:**

```vue
<ManagementSidebarHeader
  title="My Panel"
  :show-connection="true"
  :workspaceId="workspaceId"
  :show-search="true"
  v-model:search="searchInput"
>
  <template #actions>
    <Button size="iconSm" variant="ghost" @click="onRefresh">
      <Icon name="hugeicons:refresh" class="size-4!" />
    </Button>
  </template>
</ManagementSidebarHeader>
```

---

## Controlling the Sidebar Programmatically

```ts
import {
  useActivityBarStore,
  ActivityBarItemType,
} from '~/core/stores/useActivityBarStore';

const activityStore = useActivityBarStore();

// Switch to a tab
activityStore.setActivityActive(ActivityBarItemType.Schemas);

// Read current active tab
const isSchemas = activityStore.activityActive === ActivityBarItemType.Schemas;
```

The sidebar visibility is controlled by `appConfigStore.layoutSize[0]`. Use `onToggleActivityBarPanel()` from `useAppConfigStore` to open/close it — do NOT manipulate `layoutSize` directly.

---

## Hook Pattern for Panel Logic

Every non-trivial panel delegates logic to a hook. The hook receives UI callbacks via parameter (avoid importing component refs directly):

```ts
// hooks/useMyPanelTree.ts
export function useMyPanelTree(callbacks: {
  focusNode: (id: string) => void;
  collapseAll: () => void;
  expandAll: () => void;
  isExpandedAll: ComputedRef<boolean>;
}) {
  // state, API calls, event handlers
  return {
    treeData,
    searchInput,
    onClickNode,
    // ...
  };
}
```

Usage in the container:

```vue
<script setup lang="ts">
const treePanelRef = useTemplateRef<TreeInstance | null>('treePanelRef');

const { treeData, searchInput, onClickNode } = useMyPanelTree({
  focusNode: id => treePanelRef.value?.focusItem(id),
  collapseAll: () => treePanelRef.value?.collapseAll(),
  expandAll: () => treePanelRef.value?.expandAll(),
  isExpandedAll: computed(() => treePanelRef.value?.isExpandedAll ?? false),
});
</script>
```

---

## Key Constraints

- **Never add business logic directly in `PrimarySideBar.vue`** — it is a pure switcher. All logic lives in the management panel or its hooks.
- **Always use `shallowRef` for the `current` component** — `ref()` causes deep reactivity overhead on component objects.
- **Always wrap the `<component :is="current">` in `<KeepAlive>`** — this preserves scroll position and tree expand state when switching tabs.
- **Persisted tree state** (expanded keys, scroll positions) goes into `useActivityBarStore`, not into local component state.
- **Imports in `PrimarySideBar.vue` use `#components`** (Nuxt auto-import barrel) — not direct relative paths.
- **Each management sub-module** must have its own `index.ts` exporting its root component, and be re-exported from `components/modules/management/index.ts`.
