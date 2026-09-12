# MongoDB Quick Query More Options Feature Design

## 1. Overview & Goals

Provide a flexible "More options" panel in MongoDB Quick Query allowing users to configure advanced query execution parameters:

- `Project`: projection object specifying included or excluded fields
- `Sort`: sort specification object
- `Collation`: collation object for language-specific string comparison
- `Index Hint`: index name string or index specification document
- `Max Time MS`: execution time limit in milliseconds

The panel is toggled via a "More options" button placed next to the pagination controls in the control bar. When active, it displays directly underneath the filter bar (if the filter bar is open), or underneath the control bar (if the filter bar is closed).

## 2. Architecture & Components

### 2.1 Component Tree & Responsibilities

- `MongoCollectionDetail.vue` (Container):

  - State: `isShowMoreOptions` (boolean).
  - Coordinates layout order:
    1. `MongoQuickQueryControlBar.vue`
    2. `MongoCollectionFilter.vue` (rendered if `isShowFilters` is true)
    3. `MongoQueryMoreOptions.vue` (rendered if `isShowMoreOptions` is true)
    4. Data view components (`MongoCollectionListView`, `MongoCollectionInfoView`, etc.)
  - Coordinates query execution: collects both `filter` and `moreOptions` payloads, passing them to `useMongoCollectionQuery`.

- `MongoQuickQueryControlBar.vue`:

  - New prop: `isShowMoreOptions?: boolean`
  - New emit: `onToggleMoreOptions: []`
  - UI addition: A "More options" button placed directly next to `<QuickPagination>`:
    - Button variant: `outline` (with active styling `bg-accent text-accent-foreground` when `props.isShowMoreOptions` is true)
    - Icon: `hugeicons:settings-04` (or `lucide:sliders-horizontal`)
    - Label: `More options`
    - Tooltip: `Toggle query options (Project, Sort, Collation, Hint, MaxTimeMS)`

- `MongoQueryMoreOptions.vue` (New Component):
  - Located at `components/modules/quick-query/mongodb/components/MongoQueryMoreOptions.vue`.
  - Props:
    - `modelValue?: MongoQueryMoreOptionsPayload`
    - `isLoading?: boolean`
  - Emits:
    - `update:modelValue: [MongoQueryMoreOptionsPayload]`
    - `apply: [MongoQueryMoreOptionsPayload]`
    - `reset: []`
    - `close: []`
  - Layout:
    - Clean 2-column grid inside a container styled identically to `MongoCollectionFilter.vue` (`p-2 border-b border-border/40 bg-muted/20 text-xs space-y-2.5 select-none`).
    - Column 1:
      - `Project`: Label `Project`, Input placeholder `{}`
      - `Collation`: Label `Collation`, Input placeholder `{ locale: 'simple' }`
      - `Index Hint`: Label `Index Hint`, Input placeholder `—`
    - Column 2:
      - `Sort`: Label `Sort`, Input placeholder `{}`
      - `Max Time MS`: Label `Max Time MS`, Input type `number`, placeholder `60000`
    - Footer / Action Bar:
      - Left: Shortcut guidance (`⌘↵: Apply • Esc: Close`)
      - Right: `Reset` button (`variant="ghost" size="xs"`) and `Apply` button (`variant="secondary" size="xs"`, with icon `hugeicons:play` or similar)

## 3. Data Flow & Types

### 3.1 Type Definitions

In `components/modules/quick-query/mongodb/types/mongo-quick-query.types.ts`:

```typescript
export interface MongoQueryMoreOptionsPayload {
  project?: Record<string, unknown>;
  sort?: Record<string, 1 | -1 | unknown>;
  collation?: Record<string, unknown>;
  hint?: string | Record<string, unknown>;
  maxTimeMS?: number;
}
```

### 3.2 Parsing & Validation Utility

In `components/modules/quick-query/mongodb/utils/mongoMoreOptionsUtils.ts`:

- `parseMongoMoreOptionsInput(raw: { project?: string; sort?: string; collation?: string; hint?: string; maxTimeMS?: string | number }): MongoQueryMoreOptionsPayload`
  - Parses JSON strings using EJSON/JSON parser.
  - Converts empty/whitespace-only strings to `undefined`.
  - Trims and recognizes whether `hint` is a raw string index name (e.g. `email_1`) or a JSON object (e.g. `{"email": 1}`).
  - Validates `maxTimeMS` as positive integer.
  - Returns structured errors per field if JSON syntax is invalid.

### 3.3 Composable Updates (`useMongoCollectionQuery.ts`)

- New state: `activeMoreOptionsPayload = ref<MongoQueryMoreOptionsPayload | undefined>()`
- Method: `applyMoreOptions(options?: MongoQueryMoreOptionsPayload)`
  - Updates `activeMoreOptionsPayload.value = options`
  - Resets `skip.value = 0`
  - Invokes `fetchDocuments()`
- In `fetchDocuments()`, the payload body contains:
  ```typescript
  body: {
    ...getConnectionParams(params.connection.value),
    database: params.databaseName?.value,
    collection: params.collectionName.value,
    filter: activeFilterPayload.value,
    project: activeMoreOptionsPayload.value?.project,
    sort: activeMoreOptionsPayload.value?.sort,
    collation: activeMoreOptionsPayload.value?.collation,
    hint: activeMoreOptionsPayload.value?.hint,
    maxTimeMS: activeMoreOptionsPayload.value?.maxTimeMS,
    skip: skip.value,
    limit: limit.value,
  }
  ```

### 3.4 Server Handler (`server/api/mongodb/quick-query.post.ts`)

- Update `RequestBody` interface with optional `project`, `sort`, `collation`, `hint`, and `maxTimeMS`.
- Apply onto driver cursor:
  ```typescript
  let cursor = collection.find(filter);
  if (body.project && Object.keys(body.project).length > 0) {
    cursor = cursor.project(body.project);
  }
  if (body.sort && Object.keys(body.sort).length > 0) {
    cursor = cursor.sort(body.sort);
  } else {
    cursor = cursor.sort({ _id: 1 });
  }
  if (body.collation && Object.keys(body.collation).length > 0) {
    cursor = cursor.collation(body.collation as any);
  }
  if (body.hint) {
    cursor = cursor.hint(body.hint as any);
  }
  if (body.maxTimeMS && body.maxTimeMS > 0) {
    cursor = cursor.maxTimeMS(body.maxTimeMS);
  }
  ```

## 4. Error Handling

- Client-side: Syntax errors in JSON fields trigger inline red error messages directly below the corresponding field.
- Server-side: MongoDB execution errors (e.g. non-existent index hint, invalid collation locale, query timeout) return HTTP 400 with the exact MongoDB driver error message, surfaced to the user via the existing `QuickQueryErrorPopup`.

## 5. Testing Plan

- `test/unit/components/modules/quick-query/mongodb/mongoMoreOptionsUtils.spec.ts`:
  - Verify parsing of valid JSON for project, sort, collation, hint.
  - Verify hint string vs hint JSON object handling.
  - Verify error formatting for malformed JSON inputs.
- `test/nuxt/components/modules/quick-query/mongodb/MongoQuickQueryControlBar.test.ts`:
  - Verify "More options" button renders next to pagination and toggles state when clicked.
- `test/nuxt/components/modules/quick-query/mongodb/MongoQueryMoreOptions.test.ts`:
  - Verify 5 inputs render with placeholders.
  - Verify Reset clears inputs.
  - Verify Apply emits parsed payload.
  - Verify Enter / ⌘↵ shortcut triggers Apply.
