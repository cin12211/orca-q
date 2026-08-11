# MongoDB Quick Query Views Design

## Relationship to prior spec

Supersedes the UI portion of `2026-08-11-mongodb-quick-query-design.md`. That
spec's **Connection model**, **Metadata model** (inferred fields, `_id` as
primary key), and **Safety and limits** sections still apply unchanged. This
document replaces its **Quick Query model** section: instead of reusing
`QuickQuery.vue` with a family branch, MongoDB gets its own route, sidebar
tree, and view components. ERD remains out of scope for this phase.

## Goal

Let a user browse MongoDB databases and collections through a Mongo-specific
UI that never adds MongoDB branches into the existing SQL Quick Query
components (`QuickQuery.vue`, `TableOverview.vue`, `ViewOverview.vue`,
`FunctionOverview.vue`, `FunctionDetail.vue`, `useTableQueryBuilder.ts`).
MongoDB view code lives in its own sub-modules and is selected by connection
family at the same seams the codebase already uses for Redis (dedicated
route, dedicated sidebar panel, dedicated tab-dispatch case).

## Navigation model

The sidebar Schemas tree shows a two-level hierarchy for MongoDB
connections: **database → collection**. This differs from the SQL tree's
schema → table/view/function levels and is built by its own tree hook, not
by extending the SQL tree hook.

Two tab views exist:

- **Database Overview** — opened from a database node. Shows a grid listing
  every collection in that database (name, document count). Clicking a row
  opens that collection's Collection Detail tab.
- **Collection Detail** — opened from a collection node (or from a Database
  Overview row). Shows one collection's documents in a chosen display mode:
  **Table**, **List**, or **Object List**. All three modes read the same
  paginated document fetch; they only differ in rendering.
  - **Table**: `BaseDataGrid`, one row per document, columns from flattened
    field keys, row identity is `_id`. Mirrors today's Quick Query grid
    contract but built from Mongo documents instead of SQL rows.
  - **List**: one compact row per document — `_id` plus a small set of
    preview fields (first N scalar top-level fields). No full-grid columns.
  - **Object List**: one JSON tree/card per document, all fields visible,
    nested values expandable.

## Visual consistency with QuickQuery

`MongoDatabaseOverview.vue` and `MongoCollectionDetail.vue` must look like
part of the same app as `QuickQuery.vue`, not a bolted-on screen: same
toolbar height/spacing/padding, same `BaseDataGrid` theme, and a tab-strip
for the Table/List/Object List switcher styled like the existing
Data/Structure/Erd sub-tab strip (driven today by `useQuickQueryTabs`/
`QuickQueryControlBar.vue`). This is achieved by building new Mongo-only
toolbar/tab-strip components that reuse the same `components/ui` primitives
(buttons, tabs) and the same Tailwind utility classes `QuickQueryControlBar.vue`
uses for spacing/layout — never by importing `QuickQuery.vue`,
`QuickQueryControlBar.vue`, or their SQL hooks, and never by refactoring
those SQL components to extract a shared base (out of scope for this
phase — mirror the markup instead).

## Component structure

New MongoDB-only sub-module, following the flat-sub-module pattern already
documented for `quick-query/` in `module-architecture.md`:

```
components/modules/quick-query/mongodb/
├── containers/
│   ├── MongoDatabaseOverview.vue   — lists collections via useMongoDatabaseCollections + BaseDataGrid
│   ├── MongoCollectionDetail.vue   — owns the Table/List/Object List switch, composes the three view components
│   └── index.ts
├── components/
│   ├── MongoCollectionTableView.vue
│   ├── MongoCollectionListView.vue
│   ├── MongoCollectionObjectListView.vue
│   ├── MongoViewModeSwitcher.vue   — segmented control, emits selected mode
│   └── index.ts
├── hooks/
│   ├── useMongoDatabaseCollections.ts  — fetch collection list + doc counts for one database
│   ├── useMongoCollectionQuery.ts      — fetch paginated documents for one collection (filter/sort/skip/limit)
│   ├── useMongoQuickQueryMutation.ts   — insert/update/delete by `_id`
│   └── index.ts
├── types/
│   ├── mongo-quick-query.types.ts
│   └── index.ts
└── index.ts
```

A parallel sidebar sub-module:

```
components/modules/management-schemas/mongodb/
├── ManagementMongoSchemas.vue        — database -> collection tree panel
├── hooks/
│   ├── useMongoSchemaTreeData.ts     — builds the tree, tags nodes with TabViewType
│   └── index.ts
└── index.ts
```

Neither sub-module imports from, or is imported by, the SQL-only
`quick-query/hooks/`, `quick-query/structure/`, or
`management-schemas` SQL tree code. Both depend only on
`core/composables`, `core/stores`, shared `components/base`, and their own
`hooks/`/`types/`.

## Shared dispatch points touched

These are existing per-family extension seams (Redis already has a case in
each); adding a MongoDB case is additive, not new branching logic inside a
SQL component:

- `core/types/entities/tab-view.entity.ts` (`TabViewType`): add
  `MongoDatabaseOverview`, `MongoCollectionDetail`.
- `core/composables/useTabManagement.ts`: add `openMongoTab` (parallel to
  `openRedisTab`) and one `resolveRouteNameForTabType` case routing to the
  new `mongodb` page.
- `components/modules/app-shell/primary-side-bar/components/PrimarySideBar.vue`:
  add a MongoDB family branch that renders `ManagementMongoSchemas.vue`
  (parallel to the existing Redis branch).
- `core/constants/connection-capabilities.ts`: change `MONGODB_TAB_TYPES` to
  `[TabViewType.MongoDatabaseOverview, TabViewType.MongoCollectionDetail]`.

## Route

New page `pages/[workspaceId]/[connectionId]/mongodb/[tabViewId].vue`,
mirroring the existing `redis/[tabViewId].vue`: no `isSqlFamilyConnection`
gate, a two-case switch on `TabViewType` rendering
`MongoDatabaseOverview.vue` or `MongoCollectionDetail.vue`.

## Server API

- New `server/api/mongodb/collections.post.ts`: lists collection names and
  document counts for a database. Used by both `ManagementMongoSchemas`
  (tree) and `MongoDatabaseOverview` (grid). Uses the existing
  `withMongoDatabase()` helper from `mongodb.client.ts`.
- Existing `server/api/mongodb/quick-query.post.ts` and
  `quick-query-mutation.post.ts` are reused unchanged for all three
  Collection Detail view modes — the fetch is identical, only client-side
  rendering differs.

## Testing

- Unit: `useMongoDatabaseCollections`, `useMongoCollectionQuery`,
  `useMongoQuickQueryMutation` — request shape, pagination, `_id` mutation
  identity.
- Unit: `useMongoSchemaTreeData` — tree shape (database node → collection
  leaf nodes), correct `TabViewType` tagging.
- Unit: field-flattening helper used by `MongoCollectionTableView` and the
  preview-field selector used by `MongoCollectionListView`.
- Component (nuxt project): `MongoCollectionDetail.vue` switches rendered
  component when `MongoViewModeSwitcher` emits a new mode.
- Integration: `collections.post.ts` against the project's Mongo fixture —
  returns correct collection names/counts.
- Baseline: `bun run typecheck` and `bun test:unit` must stay green.

## Out of scope (unchanged from prior spec)

Raw query execution, ERD, relations, SQL-only structure tabs, backup,
import, export remain excluded for MongoDB in this phase.
