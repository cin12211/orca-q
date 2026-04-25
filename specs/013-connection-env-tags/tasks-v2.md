# Tasks: Connection Environment Tags — Follow-up Improvements

**Input**: User feedback on `013-connection-env-tags` implementation
**Branch**: `013-connection-env-tags`
**Prerequisites**: All Phase 1–6 tasks from `tasks.md` are complete ✅

---

## Summary of Changes

| #   | Change                                                                   | Scope                                     |
| --- | ------------------------------------------------------------------------ | ----------------------------------------- |
| 1   | **UI Layout** — Connection Name + Env Tags on one line (tags: 2/3 width) | `CreateConnectionModal.vue`               |
| 2   | **Bug Fix** — Save after tag change hides/deletes connection             | `managementConnectionStore.ts`            |
| 3   | **Feature** — "Add new tag" option inside the `EnvTagPicker` popover     | `EnvTagPicker.vue` + new dialog component |

---

## Phase 1: Bug Fix — Connection Disappears After Update

**Goal**: When a user edits a connection (changes name, connection string, or assigns/changes tags) and saves, the connection must remain visible in the list. Currently it disappears.

**Root Cause**: `managementConnectionStore.updateConnection` calls `loadPersistData()` which replaces the entire `connections.value` array from IDB. If the IDB entry wasn't recorded (connection only in memory) or if there's a timing edge case, the reloaded list misses the connection. The correct pattern (already commented out in the store) is to update `connections.value` in-place after a successful persist call.

**Independent Test**: Edit an existing connection — rename it, change the connection string, and/or assign/remove an env tag. Save. The connection must still appear in the list with the updated data. Repeat with no changes: must also remain visible.

- [ ] T001 Fix `updateConnection` in `core/stores/managementConnectionStore.ts` — after `window.connectionApi.update(connection)` succeeds, update `connections.value` in-place using `splice` (replace the matching index) instead of calling `loadPersistData()`; if `connectionApi.update` returns `null` (entry not found in IDB), fall back to creating it via `window.connectionApi.create(connection)` and push to `connections.value`

---

## Phase 2: UI Layout — Connection Name + Env Tags on One Line

**Goal**: In the Connection Details step (step 2 of `CreateConnectionModal.vue`), the Connection Name field and the Env Tags picker must appear on the **same horizontal line**. The Env Tags picker takes **2/3 of the row width**; Connection Name takes the remaining **1/3**.

**Layout**: Use `grid grid-cols-3 gap-3` wrapping both fields. Connection Name gets `col-span-1`, Env Tags picker gets `col-span-2`.

**Independent Test**: Open the connection modal (new or edit). In step 2, verify that Connection Name and Env Tags appear side-by-side in one row. At narrow widths the layout should stack gracefully.

- [ ] T002 [P] Update the Connection Name + Env Tags section in `components/modules/connection/components/CreateConnectionModal.vue` — replace the two stacked `<div class="space-y-2 mt-2">` blocks with a single `<div class="grid grid-cols-3 gap-3 mt-2">` containing two children: Connection Name wrapped in `col-span-1` and Env Tags picker wrapped in `col-span-2`; both labels and inputs remain inside their respective grid children

---

## Phase 3: Feature — "Add New Tag" Inline in EnvTagPicker

**Goal**: At the bottom of the `EnvTagPicker` popover, add a separator and an "Add new tag" button. Clicking it opens a compact dialog/popup where the user can fill in a tag name, choose a color, and optionally enable strictMode. On confirm the tag is created via `useEnvironmentTagStore.createTag()` and automatically selected in the picker (if below the 3-tag limit).

**Independent Test**: Open the EnvTagPicker. Click "Add new tag". Fill in a name (e.g., "hotfix"), pick a color, leave strictMode off, click Create. The dialog closes, the new tag appears in the picker list, and it is already checked. The picker now shows the new tag badge. Open tag management in Settings and verify the new tag is persisted.

- [ ] T003 [P] Create `CreateEnvTagDialog.vue` in `components/modules/environment-tag/components/` — a small `Dialog` that:

  - Accepts `open: boolean` prop and emits `update:open`, `created` (with the new `EnvironmentTag`)
  - Contains a name `Input` (max 30 chars), a color dot-picker row (same pattern as `TagManagementContainer`), and a `Switch` for strictMode
  - Validates with `createEnvTagSchema.safeParse` from `schemas/envTag.schema.ts`; shows inline error if name is duplicate (case-insensitive check against `useEnvironmentTagStore().tags`)
  - On submit, calls `useEnvironmentTagStore().createTag(payload)` and emits `created` with the returned tag; on cancel/close emits `update:open` with `false`
  - Has a footer with Cancel + Create buttons; Create is disabled while name is empty or has a validation error

- [ ] T004 Update `components/modules/environment-tag/components/EnvTagPicker.vue` — add:

  1. A local `showCreateDialog = ref(false)` state
  2. At the bottom of `PopoverContent`, after the tags list: a `<Separator />` (from `@/components/ui/separator`) and a `<button>` row labeled "+ Add new tag" (icon: `hugeicons:plus-sign`, text: "Add new tag")
  3. Import and render `<CreateEnvTagDialog v-model:open="showCreateDialog" @created="onTagCreated" />`
  4. `onTagCreated(tag: EnvironmentTag)` handler: if `!atLimit`, emit `update:modelValue` with `[...props.modelValue, tag.id]`

- [ ] T005 Export `CreateEnvTagDialog` from `components/modules/environment-tag/index.ts`

---

## Dependencies & Execution Order

- **T001** (bug fix): independent — implement first, no dependencies
- **T002** (UI layout): independent of T001 — can run in parallel
- **T003** (new dialog): must be done before T004
- **T004** (picker update): depends on T003
- **T005** (export): depends on T003

### Parallel opportunities

```bash
# Stage A — fully parallel:
T001   # bug fix in store
T002   # UI layout in modal
T003   # new CreateEnvTagDialog component

# Stage B — after T003:
T004   # wire dialog into EnvTagPicker
T005   # export from index.ts
```

---

## Implementation Notes

### T001 — Store fix detail

```typescript
// core/stores/managementConnectionStore.ts
const updateConnection = async (connection: Connection) => {
  const result = await window.connectionApi.update(connection);

  if (result) {
    // Happy path: update the reactive array in-place
    const idx = connections.value.findIndex(c => c.id === connection.id);
    if (idx !== -1) {
      connections.value.splice(idx, 1, result);
    }
  } else {
    // Fallback: entry not in IDB — create it and push
    const created = await window.connectionApi.create(connection);
    if (created) connections.value.push(created);
  }
};
```

### T002 — Layout detail

```html
<!-- Before: two stacked divs -->
<div class="mt-2 space-y-2">Connection Name...</div>
<div class="mt-2 space-y-2">Environment Tags...</div>

<!-- After: one grid row -->
<div class="mt-2 grid grid-cols-3 gap-3">
  <div class="col-span-1 space-y-2">Connection Name...</div>
  <div class="col-span-2 space-y-2">Environment Tags...</div>
</div>
```

### T003 — CreateEnvTagDialog structure

Reuse the patterns from `TagManagementContainer.vue` (name input + color dot picker + strictMode switch + Zod validation + duplicate-name check). Keep the dialog minimal: name, color, strictMode, create/cancel buttons.

### T004 — EnvTagPicker "Add new tag" row

Place it after the `</ul>` (tags list) and `"No tags configured"` paragraph, before `</PopoverContent>`:

```html
<Separator class="my-1" />
<button
  type="button"
  class="text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:bg-accent flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors focus-visible:outline-none"
  @click="showCreateDialog = true"
>
  <Icon name="hugeicons:plus-sign" class="size-4" />
  Add new tag
</button>
```

---

## Checklist

```
□ T001: updateConnection uses in-place splice; falls back to create if update returns null
□ T002: Connection Name col-span-1, Env Tags col-span-2 inside grid-cols-3
□ T003: CreateEnvTagDialog validates name, color, strictMode; calls createTag on submit
□ T004: EnvTagPicker shows "Add new tag" button; onTagCreated auto-selects if under limit
□ T005: CreateEnvTagDialog exported from module index.ts
□ vue-tsc --noEmit passes with 0 errors
```
