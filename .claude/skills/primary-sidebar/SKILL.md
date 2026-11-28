---
name: primary-sidebar
description: Complete guide for adding, updating, and removing tabs in the Primary Sidebar of OrcaQ. Covers the full flow — ActivityBarItemType enum → connection capability profile (which tabs each family shows) → activity bar items → PrimarySideBar switcher → Management panel component. Load this skill for any task involving the left sidebar, activity bar tabs, or management panels (Explorer, Schemas, ERD, Users & Roles, Database Tools, Agent, and the Redis/MongoDB/RabbitMQ/Kafka variants).
---

# Primary Sidebar Flow — OrcaQ

## Architecture Overview

The Primary Sidebar shows one panel at a time, chosen from the active tab in a Pinia store and the selected connection's family:

```
ActivityBarItemType (enum)                     ← Tab identity
CONNECTION_CAPABILITY_REGISTRY[family]         ← Which tabs a family shows + default tab
  .visibleActivityItems / .defaultActivityItem
getVisibleActivityItems()                      ← Extra per-type hiding (Agent, Users & Roles)
useActivityBarStore.activityActive             ← Which tab is active (persisted)
useActivityMenu / BASE_ACTIVITY_ITEMS          ← Activity Bar icons (filtered to visible tabs)
PrimarySideBar.vue                             ← computed `current`: family + tab → panel
Management***.vue                              ← The panel content (KeepAlive'd)
```

The Activity Bar (narrow icon strip on the far left) calls `onChangeActivity(type)` from `useActivityMenu`, which ignores hidden tabs and calls `setActivityActive(type)`. When the selected connection changes, `PrimarySideBar.vue` calls `ensureActivityVisible()` so the active tab falls back to the family's default if it is no longer visible.

---

## File Locations

| Purpose                                   | File                                                                           |
| ----------------------------------------- | ------------------------------------------------------------------------------ |
| Tab type enum + store                     | `core/stores/useActivityBarStore.ts`                                           |
| Family capability profiles (visible tabs) | `core/constants/connection-capabilities.ts`                                    |
| Activity Bar items, icons, hidden types   | `components/modules/app-shell/activity-bar/constants/activityBarVisibility.ts` |
| Visible-tab filter                        | `components/modules/app-shell/activity-bar/utils/getVisibleActivityItems.ts`   |
| Activity Bar menu hook                    | `components/modules/app-shell/activity-bar/hooks/useActivityMenu.ts`           |
| Sidebar shell (switcher)                  | `components/modules/app-shell/primary-side-bar/components/PrimarySideBar.vue`  |
| All management panels                     | `components/modules/management/`                                               |
| Shared header component                   | `components/modules/management/shared/components/ManagementSidebarHeader.vue`  |

### Management panel locations

| Family         | Tab            | Panel component file                                                             |
| -------------- | -------------- | -------------------------------------------------------------------------------- |
| SQL, Redis     | Explorer       | `components/modules/management/explorer/ManagementExplorer.vue`                  |
| SQL            | Schemas        | `components/modules/management/schemas/ManagementSchemas.vue`                    |
| SQL            | ERD Diagram    | `components/modules/management/erd-diagram/ManagementErdDiagram.vue`             |
| SQL            | Users & Roles  | `components/modules/management/role-permission/ManagementUsersAndPermission.vue` |
| SQL            | Database Tools | `components/modules/management/database-tools/ManagementDatabaseTools.vue`       |
| SQL, Redis     | Agent          | `components/modules/management/agent/ManagementAgent.vue`                        |
| Redis          | Schemas        | `components/modules/management/redis-browser/ManagementRedisBrowser.vue`         |
| Redis          | Database Tools | `components/modules/management/redis-tools/ManagementRedisTools.vue`             |
| MongoDB        | Schemas        | `components/modules/management/schemas/mongodb/ManagementMongoSchemas.vue`       |
| RabbitMQ       | Schemas        | `components/modules/management/rabbitmq-browser/ManagementRabbitBrowser.vue`     |
| Kafka          | Schemas        | `components/modules/management/kafka-browser/ManagementKafkaBrowser.vue`         |
| RabbitMQ/Kafka | Database Tools | `components/modules/management/broker-tools/ManagementBrokerTools.vue`           |
| RabbitMQ       | Users & Roles  | `components/modules/management/rabbitmq-users/ManagementRabbitUsers.vue`         |

Per-type hiding on top of the family profile lives in `activityBarVisibility.ts`: `AGENT_HIDDEN_CONNECTION_TYPES` and `USERS_ROLES_HIDDEN_CONNECTION_TYPES` (e.g. MySQL, SQLite, DuckDB, SQL Server, CockroachDB, Oracle hide Users & Roles).

---

## How the Switcher Works (`PrimarySideBar.vue`)

```vue
<script setup lang="ts">
const currentFamily = computed(() =>
  resolveConnectionFamily(
    managementConnectionStore.selectedConnection ?? DEFAULT_CONNECTION_CONTEXT
  )
);

watch(
  capabilityProfile,
  profile => {
    activityStore.ensureActivityVisible(
      visibleActivityItems.value,
      ACTIVITY_ITEM_MAP[profile.defaultActivityItem]
    );
  },
  { immediate: true }
);

const current = computed(() => {
  if (currentFamily.value === EConnectionFamily.MONGODB) {
    if (activityStore.activityActive === ActivityBarItemType.Schemas)
      return ManagementMongoSchemas;
    return null;
  }
  // ... RabbitMQ/Kafka branch, Redis branch ...
  if (activityStore.activityActive === ActivityBarItemType.Explorer)
    return ManagementExplorer;
  // ... one branch per SQL tab
  return null;
});
</script>

<template>
  <div class="w-full h-full flex flex-col" v-if="appConfigStore.layoutSize[0]">
    <KeepAlive v-if="current">
      <component :is="current" />
    </KeepAlive>
  </div>
</template>
```

Key points:

- `current` is a `computed` over family + active tab; non-SQL families return early.
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
  DatabaseTools = 'DatabaseTools',
  Agent = 'Agent',
  MyNewTab = 'MyNewTab', // ← new
}
```

### Step 2 — Make it visible for the right families

1. In `core/constants/connection-capabilities.ts`, add `'MyNewTab'` to the `ConnectionActivityItem` union and to `visibleActivityItems` of each family profile in `CONNECTION_CAPABILITY_REGISTRY` that should show it. Families that hide it can give a reason in `hiddenFeatureReasons`.
2. In `activityBarVisibility.ts`, add the mapping to `ACTIVITY_ITEM_MAP` and an entry (id, title, `hugeicons:*` icon — verify it exists) to `BASE_ACTIVITY_ITEMS`. `useActivityMenu` renders the Activity Bar button from that list; no separate button code is needed.
3. If only some connection types of a family should hide it, add a hidden-types set next to `AGENT_HIDDEN_CONNECTION_TYPES` and filter it in `getVisibleActivityItems.ts`.

### Step 3 — Create the management panel module

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

Optionally re-export it from `components/modules/management/index.ts` (the SQL panels are; the Redis/broker panels are not, since `#components` resolves them anyway).

### Step 4 — Register in PrimarySideBar

In `components/modules/app-shell/primary-side-bar/components/PrimarySideBar.vue`, import from `#components` and add a branch to `current` inside the family branch where the tab belongs (SQL branches are at the bottom, after the early-return family branches):

```ts
import { ManagementMyNewTab } from '#components';

if (activityStore.activityActive === ActivityBarItemType.MyNewTab) {
  return ManagementMyNewTab;
}
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

It also accepts a `v-model:search` for two-way search binding, an `#actions` slot for icon buttons in the title bar, and a `#details` slot below the selectors.

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

- **Never add business logic directly in `PrimarySideBar.vue`** — it only maps family + tab to a panel. All logic lives in the management panel or its hooks.
- **Visibility comes from the capability profile**, not from ad-hoc checks in the Activity Bar: update `visibleActivityItems` (and the hidden-type sets) so `useActivityMenu`, `onChangeActivity` and `ensureActivityVisible` all agree.
- **Always wrap the `<component :is="current">` in `<KeepAlive>`** — this preserves scroll position and tree expand state when switching tabs.
- **Persisted tree state** (expanded keys, scroll positions) goes into `useActivityBarStore`, not into local component state.
- **Imports in `PrimarySideBar.vue` use `#components`** (Nuxt auto-import barrel) — not direct relative paths.
- **Each management sub-module** has its own `index.ts` exporting its root component.
