# MongoDB Compass-Style Document Editing in List View Design

## Goal

Provide a MongoDB Compass-style document editing experience within the MongoDB Quick Query List View (`MongoCollectionListView.vue`). Users can toggle a document card into a JSON code editor, make edits, see a "Save" button appear in the item header upon changes (`isDirty`), and save updates directly to MongoDB with instant in-place reflection and feedback.

## Context & Background

Currently, `MongoCollectionListView.vue` renders documents inside a virtualized list (`@tanstack/vue-virtual`) using `VueJsonPretty` in read-only mode. While the backend endpoint `/api/mongodb/quick-query-mutation.post.ts` already supports `operation: 'update'` (updating documents by selector `id` via `findOneAndUpdate` and stripping `_id` from `$set`), the frontend lacks an interactive editing flow in List View.

## User Experience & Compass-Style Flow

1. **Read Mode (Default):**
   - Each item card displays:
     - **Header Left:** `hugeicons:files-01` icon + `_id: <value>`.
     - **Header Right:**
       - **Edit** button (`hugeicons:pencil-edit-02`, tooltip: _"Edit document"_).
       - **Expand/Collapse** button (`hugeicons:unfold-more` / `hugeicons:unfold-less`).
       - **Copy** button (`hugeicons:copy-01`).
     - **Body:** `VueJsonPretty` tree renderer.
2. **Entering Edit Mode:**
   - Clicking **Edit** transitions the specific card into Edit mode.
   - At most **one document** can be in Edit mode at a time (mirroring MongoDB Compass). If another item enters Edit mode, the previous active editor is closed/cancelled.
   - The body transitions from `VueJsonPretty` to `BaseCodeEditor` (CodeMirror with `@codemirror/lang-json` and `linter(jsonParseLinter())`), pre-filled with formatted JSON (`JSON.stringify(doc, null, 2)`).
   - Card height adapts dynamically (`min-height: 140px`, `max-height: 480px` with internal scroll), and the TanStack Virtualizer recalculates row layout via `measureElement`.
3. **Dirty Detection & Header Actions:**
   - **Cancel** button (`hugeicons:cancel-01`, tooltip: _"Cancel changes"_): Discards edits, resets dirty state, and returns to Read mode.
   - **Save / Update** button (`hugeicons:floppy-disk`, primary variant `size="xs"`):
     - **Hidden initially**, appears in the item header as soon as user changes the JSON content (`isDirty === true`).
     - Shows a loading spinner when `isSaving === true`.
4. **Saving & Success Feedback:**
   - Clicking **Save**:
     - Validates JSON syntax via `JSON.parse`. If invalid, displays a `toast.error('Invalid JSON syntax')` and halts.
     - Preserves the original `_id` as the selector ID.
     - Dispatches mutation to `/api/mongodb/quick-query-mutation`.
     - On success: updates document in-place in the reactive `documents` list, displays `toast.success('Document updated successfully!')`, and closes Edit mode.
     - On failure: displays `toast.error(message)`, keeping Edit mode open so user does not lose unsaved changes.

## Component Architecture & Structure

Following `module-architecture.md` (Clean Architecture, Single Responsibility, folder `index.ts` exports):

```
components/modules/quick-query/mongodb/
├── components/
│   ├── MongoCollectionListItem.vue     — NEW: Single document card (Header actions, VueJsonPretty / BaseCodeEditor toggle, dirty tracking)
│   ├── MongoCollectionListView.vue     — UPDATED: Manages TanStack virtualizer, activeEditDocId, and passes mutation handler
│   └── index.ts                        — UPDATED: Exports MongoCollectionListItem
├── hooks/
│   ├── useMongoDocumentMutation.ts     — NEW: Calls quick-query-mutation API, updates in-place, handles toast alerts
│   └── index.ts                        — UPDATED: Exports useMongoDocumentMutation
└── containers/
    └── MongoCollectionDetail.vue       — UPDATED: Instantiates useMongoDocumentMutation and wires to MongoCollectionListView
```

### 1. `MongoCollectionListItem.vue`

- **Props:**
  - `document: MongoDocument`: Document object.
  - `isExpanded: boolean`: Tree expansion state in read mode.
  - `isEditing: boolean`: Whether this item is currently being edited.
  - `isSaving: boolean`: Whether this item is currently being persisted to the server.
- **Emits:**
  - `toggle-expand`: Toggles key expansion in read mode.
  - `start-edit`: Requests entering edit mode for this item.
  - `cancel-edit`: Cancels edit mode and reverts draft.
  - `save: [updatedDocument: Record<string, unknown>]`: Emits parsed JSON document when Save is clicked.
  - `resize`: Requests row measurement update from parent virtualizer.
- **Internal State:**
  - `draftJson: ref<string>`: Local text buffer for CodeMirror editor.
  - `isDirty: computed<boolean>`: Compares normalized `draftJson` against initial JSON string.

### 2. `MongoCollectionListView.vue`

- **Responsibilities:**
  - Virtualizes rows via `@tanstack/vue-virtual`.
  - Manages `activeEditDocId: ref<string | null>(null)`.
  - On `start-edit(docId)`: Sets `activeEditDocId.value = docId`, triggers `rowVirtualizer.measureElement`.
  - On `cancel-edit`: Sets `activeEditDocId.value = null`, triggers `rowVirtualizer.measureElement`.
  - On `save(docId, updatedDoc)`: Calls `props.onUpdateDocument(docId, updatedDoc)`. On success, sets `activeEditDocId.value = null`.

### 3. `useMongoDocumentMutation.ts`

- **Params:**
  - `connection: Ref<Connection | undefined>`
  - `databaseName: Ref<string | undefined>`
  - `collectionName: Ref<string>`
  - `documents: Ref<MongoDocument[]>`
- **Returns:**
  - `isMutating: Ref<boolean>`
  - `savingDocId: Ref<string | null>`
  - `updateDocument(id: string, updatedDoc: Record<string, unknown>): Promise<boolean>`
- **Logic:**
  - Calls `/api/mongodb/quick-query-mutation` with:
    `{ ...getConnectionParams(connection.value), database: databaseName.value, collection: collectionName.value, operation: 'update', id, document: updatedDoc }`
  - On 200 response:
    - Finds item index in `documents.value` by `_id === id`.
    - Updates reactive item: `documents.value[index] = response.document ?? { ...documents.value[index], ...updatedDoc }`.
    - Dispatches `toast.success('Document updated successfully!')`.
    - Returns `true`.
  - On catch error:
    - Dispatches `toast.error(error.message || 'Failed to update document')`.
    - Returns `false`.

## Virtualizer Layout & Height Handling

Switching between `VueJsonPretty` and `BaseCodeEditor` changes DOM height:

- Component emits `resize` or calls `rowVirtualizer.measureElement(domElement)` on `nextTick` after `isEditing` changes.
- Row container maintains `overflow-anchor: none` to prevent scroll jumps during virtual list height updates.

## Safety & Validation Rules

1. **JSON Syntax Integrity:** Pre-save JSON parsing validation prevents submitting corrupted or malformed documents. CodeMirror linter visually warns user during typing.
2. **Immutable `_id` Guarantee:** The selector `id` passed to backend update query is pinned to the original document `_id`. Even if the text in `draftJson` modifies `_id`, the backend selector remains unaffected, and `_id` is excluded from `$set`.
3. **Single Active Editor:** Restricting concurrent edits to 1 document ensures clear focus and prevents divergent dirty states.

## Testing Strategy

1. **Unit Tests (`test/unit/components/modules/quick-query/mongodb/useMongoDocumentMutation.test.ts`):**
   - Tests successful update calling `/api/mongodb/quick-query-mutation` and verifying in-place replacement of the document inside `documents` ref.
   - Tests error handling when fetch throws, verifying toast error and `false` return value.
2. **Component Tests (`test/unit/components/modules/quick-query/mongodb/MongoCollectionListItem.test.ts`):**
   - Tests rendering of `_id`, Edit, Expand, Copy buttons in read mode.
   - Tests transition into edit mode upon clicking Edit.
   - Tests dirty state detection: Save button absent initially, appears when text changes.
   - Tests clicking Save emits `save` with parsed JSON.
   - Tests clicking Cancel reverts draft and emits `cancel-edit`.
3. **Verification Checklist:**
   - `bun run typecheck` passes with zero errors.
   - `bun test:unit` passes.
