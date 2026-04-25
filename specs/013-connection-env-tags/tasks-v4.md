# Tasks v4: Connection Environment Tags — Follow-up Fixes (April 11, 2026)

**Scope**: Three targeted changes on top of the implemented feature.

## Arguments

1. **Update StrictModeConfirmDialog**: Change confirm phrase `"this is production"` → `"this is prod"`. Change button label `"Connect Anyway"` → `"Connect"`. Remove `variant="destructive"` from the confirm button (use default variant).
2. **ConnectionSelector — show env tags**: Each connection option in the `ConnectionSelector` dropdown should display its assigned env tag badges alongside the connection name.
3. **Strict mode guard — all connect call sites**: Wire `checkAndConfirm` into `ConnectionSelector.onChangeConnection`, which currently calls `openWorkspaceWithConnection` without a strict-mode check. (`ConnectionsList.vue` and `useWorkspaceCard.ts` already have the guard.)

## Root Cause Analysis

### T002 — Tags not shown in ConnectionSelector

`ConnectionSelector.vue` renders each `<SelectItem>` with only the DB icon + name. It does not use `tagStore` or `EnvTagBadge` at all.

### T003 — ConnectionSelector bypasses strict mode

`onChangeConnection` does: `await openWorkspaceWithConnection(...)` with no guard call.
The connection object IS available via `connectionsByWsId.find(c => c.id === connectionId)`.

---

## Phase 1: Dialog copy & button style

- [ ] T001 [P] Update `StrictModeConfirmDialog.vue`:
  1. Change `CONFIRM_PHRASE` constant from `'this is production'` to `'this is prod'`
  2. Change button label from `Connect Anyway` to `Connect`
  3. Remove `variant="destructive"` from the confirm `<Button>` (use implicit default variant)
     File: `components/modules/environment-tag/components/StrictModeConfirmDialog.vue`

---

## Phase 2: ConnectionSelector — env tags + strict guard

- [ ] T002 Update `ConnectionSelector.vue` — display env tag badges per connection:

  1. Import `useEnvironmentTagStore` and `EnvTagBadge` from `@/components/modules/environment-tag`
  2. Call `const tagStore = useEnvironmentTagStore()` in `<script setup>`
  3. Inside each `<SelectItem>`, after the connection name span, add a flex row of `<EnvTagBadge>` for each tag in `tagStore.getTagsByIds(connection.tagIds ?? [])`
     File: `components/modules/selectors/ConnectionSelector.vue`

- [ ] T003 Update `ConnectionSelector.vue` — wire strict mode guard on connection switch:
  1. Import `useStrictModeGuard` from `@/components/modules/environment-tag`
  2. Call `const { checkAndConfirm } = useStrictModeGuard()` in `<script setup>`
  3. In `onChangeConnection`, before calling `openWorkspaceWithConnection`, find the connection object via `connectionsByWsId.value.find(c => c.id === connectionId)`, call `await checkAndConfirm(connection)` and return early if `false`
     File: `components/modules/selectors/ConnectionSelector.vue`

---

## Dependencies

```
T001  (independent — different file)
T002  (must complete before T003 — both modify the same file, sequential)
  └── T003
```

## Independent test criteria

- **T001**: Open strict-mode dialog → type `"this is prod"` → Connect button becomes enabled; button is default (not red).
- **T002**: Open ConnectionSelector dropdown → connections with tags show colored badges next to name.
- **T003**: Switch to a strict-mode-tagged connection in ConnectionSelector → dialog appears and blocks switch until phrase entered; selecting a non-strict connection proceeds immediately.
