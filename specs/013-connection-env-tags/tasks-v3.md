# Tasks v3: Connection Environment Tags — Follow-up Fixes (April 11, 2026)

**Scope**: Two targeted fixes on top of the implemented feature (tasks.md + tasks-v2.md).

## Arguments

1. **Bug**: When updating a connection, the assigned env tags do not persist / update.
2. **Enhancement**: When _creating_ a new connection, the `dev` tag should be pre-selected by default.

## Root Cause Analysis

### Bug — tags not saved on update

The watch in `useConnectionForm.ts` observes **both** `isOpen` and `editingConnection` as a combined source:

```typescript
watch(
  () => [isOpen.value, editingConnection.value],
  () => { ... tagIds.value = conn.tagIds ?? []; },
  { immediate: true }
)
```

Because `editingConnection` is included in the source, any reactive change to the parent's
`editingConnection` prop (e.g. Pinia's reactive proxy updating when the parent re-renders)
can trigger a mid-session reset of `tagIds.value` — overwriting the user's in-progress
tag selection with the stored value before the save completes.

**Fix**: Split into two watches so form data is loaded _only_ on `isOpen → true` transitions,
never on mid-session `editingConnection` prop changes.

### Enhancement — default dev tag

`resetForm()` currently sets `tagIds.value = []`. We need it to pre-select the `dev` tag
when one exists in the tag store.

---

## Phase 1: Bug fix — tag IDs not persisting on update

- [ ] T001 Fix `useConnectionForm.ts` — replace the combined `isOpen + editingConnection` watch
      with two separate watches so tag changes are never overwritten mid-session:
      (1) a watch on `isOpen` only that loads the full connection form when the modal opens,
      (2) keep the existing `dbType` watch for port auto-fill unchanged.
      Within the new `isOpen` watch callback, copy `tagIds` defensively:
      `tagIds.value = [...(editingConnection.value.tagIds ?? [])]`
      File: `components/modules/connection/hooks/useConnectionForm.ts`

---

## Phase 2: Enhancement — default dev tag on new connection

- [ ] T002 [P] In `useConnectionForm.ts`, import `useEnvironmentTagStore` from
      `@/components/modules/environment-tag` and call it at the top of the composable function
      to get `tagStore`. In `resetForm()`, replace `tagIds.value = []` with:
      `const devTag = tagStore.tags.find(t => t.name === 'dev'); tagIds.value = devTag ? [devTag.id] : [];`
      File: `components/modules/connection/hooks/useConnectionForm.ts`

---

## Dependencies

```
T001  (must complete first — changes the watch structure that T002's resetForm call lives in)
  └── T002  (modifies resetForm inside the same file)
```

## Independent test criteria

- **T001**: Open edit modal for a connection that has tags → change the selection → click Update
  → connection list shows the **new** tags, not the original ones.
- **T002**: Open the "Add Connection" modal (new connection flow) → step 2 → the `dev`
  environment tag is already checked in the picker.
