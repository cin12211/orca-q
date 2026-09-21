---
name: primary-sidebar
description: Complete guide for adding, updating, and removing tabs in the Primary Sidebar of OrcaQ. Covers the full flow — connection capability config → activity bar → useActivityBarStore → PrimarySideBar container → per-activity *SidebarPanel wrapper → driver panel in components/modules/driver. Load this skill for any task involving the left sidebar, activity bar tabs, or sidebar panels (Explorer, Schemas, ERD, Users & Roles, Database Tools, Agent) for any database type.
---

# Primary Sidebar — OrcaQ

**Read first:** `components/modules/app-shell/primary-side-bar/docs/PRIMARY_SIDEBAR_FLOW.md`.
It has the full flow diagram, the visibility matrix per database type, the panel
matrix per activity and the recipes. This skill is the short version.

## Flow

```
core/constants/connection-capabilities.ts   one profile per DatabaseClientType (visibleActivityItems, defaultActivityItem)
  → activity-bar/hooks/useVisibleActivityItems.ts   profile of the selected connection
  → activity-bar/hooks/useActivityMenu.ts           icons, onChangeActivity()
  → core/stores/useActivityBarStore.ts              activityActive (persisted)
  → primary-side-bar/container/PrimarySideBar.vue   switch ActivityBarItemType
  → primary-side-bar/components/<Activity>SidebarPanel.vue   switch DatabaseClientType
  → components/modules/driver/**/primary-panel/<activity>/   the panel itself
```

## File locations

| Purpose                                                        | Path                                                                               |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Activity enum                                                  | `core/types/entities/activity-bar.entity.ts` (re-exported by the store)            |
| Activity state                                                 | `core/stores/useActivityBarStore.ts`                                               |
| Visibility per database type (single source)                   | `core/constants/connection-capabilities.ts` (`CONNECTION_CAPABILITY_REGISTRY`)     |
| Icons and titles only (`BASE_ACTIVITY_ITEMS`: id, title, icon) | `core/constants/activityBarVisibility.ts`                                          |
| Sidebar container                                              | `components/modules/app-shell/primary-side-bar/container/PrimarySideBar.vue`       |
| Per-activity wrappers                                          | `components/modules/app-shell/primary-side-bar/components/*SidebarPanel.vue`       |
| Panels shared by all families                                  | `components/modules/driver/shared/primary-panel/{explorer,schemas,agent}/`         |
| Panels shared by SQL                                           | `components/modules/driver/shared/sql/primary-panel/{erd-diagram,database-tools}/` |
| Engine panels                                                  | `components/modules/driver/{postgres,redis,mongodb}/primary-panel/<activity>/`     |
| Shared header                                                  | `components/modules/driver/shared/primary-panel/shared/` (`PrimaryPanelHeader`)    |

## Wrapper pattern

Every `*SidebarPanel.vue` has the same shape. List each SQL type explicitly and
keep `default` on the SQL branch so unknown types behave as before.

```vue
<script setup lang="ts">
import type { Component } from 'vue';
import {
  MongoSchemasPanel,
  RedisSchemasPanel,
  SqlSchemasPanel,
} from '#components';
import { DatabaseClientType } from '~/core/constants/database-client-type';

const props = defineProps<{ dbType?: DatabaseClientType }>();

const current = computed<Component | null>(() => {
  switch (props.dbType) {
    case DatabaseClientType.MONGODB:
      return MongoSchemasPanel;
    case DatabaseClientType.REDIS:
      return RedisSchemasPanel;
    case DatabaseClientType.POSTGRES:
    // ...other SQL types
    default:
      return SqlSchemasPanel;
  }
});
</script>

<template>
  <KeepAlive>
    <component :is="current" v-if="current" />
  </KeepAlive>
</template>
```

## Checklists

**Engine-specific panel for an existing activity**

1. Create `driver/<engine>/primary-panel/<activity>/<Engine><Activity>Panel.vue` + `index.ts`.
2. Return it from the matching `case` in `<Activity>SidebarPanel.vue`.
3. File names must be unique under `components/` (Nuxt uses `pathPrefix: false`).

**Show an activity for another database type**

1. Add it to that type's `visibleActivityItems` in `CONNECTION_CAPABILITY_REGISTRY` (`connection-capabilities.ts`).
2. Return a panel instead of `null` in the wrapper.
3. Update the matrix in `test/unit/core/constants/connection-capabilities.spec.ts`.

**New activity**

1. `ActivityBarItemType` enum (`core/types/entities/activity-bar.entity.ts`) → `BASE_ACTIVITY_ITEMS` entry (`id`, `title`, `icon`; verify the hugeicons name).
2. Add it to the `visibleActivityItems` of each type in `CONNECTION_CAPABILITY_REGISTRY`.
3. Create `<Activity>SidebarPanel.vue`, export it from `components/index.ts`, add a `case` in `PrimarySideBar.vue`.
4. Create the panels under `driver/**/primary-panel/<activity>/`.

## PrimaryPanelHeader

```ts
import { PrimaryPanelHeader } from '~/components/modules/driver/shared/primary-panel/shared';
```

| Prop                | Type      | Default       | Purpose                                |
| ------------------- | --------- | ------------- | -------------------------------------- |
| `title`             | `string`  | required      | Panel title                            |
| `showConnection`    | `boolean` | `false`       | Show the connection selector           |
| `showSchema`        | `boolean` | `false`       | Show the schema selector               |
| `workspaceId`       | `string`  | —             | Required when `showConnection` is true |
| `showSearch`        | `boolean` | `false`       | Show the search input                  |
| `searchPlaceholder` | `string`  | `'Search...'` | Input placeholder                      |

Also supports `v-model:search`, an `#actions` slot for title-bar buttons and a `#details` slot below the title.

## Rules

- `PrimarySideBar` and the wrappers only switch; logic lives in the driver panel and its hooks.
- Keep `<KeepAlive>` at every level so panels keep tree/scroll state.
- Persisted UI state (expanded nodes, scroll position) goes in `useActivityBarStore`.
- Driver folders never import each other; shared code goes in `driver/shared/`.
- Toggle the sidebar with `appConfigStore.onToggleActivityBarPanel()`, never by editing `layoutSize`.
