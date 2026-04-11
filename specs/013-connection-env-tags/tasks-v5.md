# Tasks v5: Environment Tag Management Improvements (April 11, 2026)

## Arguments

1. **System tags protected**: Default (seeded) tags are not deletable. Add an `isSystem` flag.
2. **Name length limit**: Tag name max = 10 characters (schema + UI).
3. **Edit tag**: Add an edit icon per tag in `TagManagementContainer` that opens an edit dialog (name, color, strictMode).

---

## Phase 1: Data model — isSystem flag

- [ ] T001 [P] Add `isSystem?: boolean` to `EnvironmentTag` interface in
      `components/modules/environment-tag/types/environmentTag.types.ts`

- [ ] T002 [P] Set `isSystem: true` on all 5 entries in
      `components/modules/environment-tag/constants/DEFAULT_ENV_TAGS.ts`

---

## Phase 2: Name length

- [ ] T003 [P] Update `createEnvTagSchema` in
      `components/modules/environment-tag/schemas/envTag.schema.ts` — change `.max(30, ...)` to `.max(10, 'Name must be 10 characters or fewer')`

---

## Phase 3: Store — updateTag action

- [ ] T004 Add `updateTag` action to `useEnvironmentTagStore`:
      calls `environmentTagService.update(tag)`, then replaces the entry in `tags` in-place (splice).
      File: `components/modules/environment-tag/hooks/useEnvironmentTagStore.ts`

---

## Phase 4: Edit dialog — extend CreateEnvTagDialog

- [ ] T005 Extend `CreateEnvTagDialog.vue` to support edit mode via an optional `editingTag` prop:
  - When `editingTag` is provided: pre-fill name/color/strictMode from it, show title "Edit Tag", call `store.updateTag` on submit (keeping the same id/createdAt), emit `updated` with the new tag instead of `created`, isDuplicate excludes the tag being edited
  - When `editingTag` is absent (current create mode): unchanged behaviour
  - Change maxlength on the `<Input>` from `"30"` to `"10"`
  - Add `updated: [tag: EnvironmentTag]` to the emits definition
    File: `components/modules/environment-tag/components/CreateEnvTagDialog.vue`

---

## Phase 5: TagManagementContainer — edit button + delete guard

- [ ] T006 Update `TagManagementContainer.vue`:
  1. Add `editingTag = ref<EnvironmentTag | null>(null)` and `isEditTagDialogOpen = computed(() => !!editingTag.value)`
  2. Add an edit icon `<Button>` beside the existing delete `<Button>` for each tag row — clicking sets `editingTag.value = tag`
  3. Hide the delete `<Button>` entirely when `tag.isSystem === true`
  4. Wire `<CreateEnvTagDialog>` in edit mode: `:editing-tag="editingTag"` and `v-model:open` bound to a writable computed that sets `editingTag.value = null` on close
     File: `components/modules/environment-tag/containers/TagManagementContainer.vue`

---

## Dependencies

```
T001 → T002 (both edit the type/constants — independent of each other, parallelisable)
T003 (schema — independent)
T004 (store — independent)
T001 + T004 → T005 → T006
```

## Independent test criteria

- **T001–T002**: `prod` tag in the store has `isSystem: true` after seeding.
- **T003**: Creating/editing a tag with an 11-char name is rejected.
- **T004**: Editing a tag name in the UI reflects immediately in `ConnectionsList` badges.
- **T005**: Dialog opens pre-filled when `editingTag` is passed; "Edit Tag" title; saves without resetting the tag ID.
- **T006**: Delete button is absent for system tags; edit icon opens edit dialog for all tags.
