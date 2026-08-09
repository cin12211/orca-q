# Redis Browser Enhancements — Design

Date: 2026-08-09
Branch: `enhance-redis`
Scope: `components/modules/management/redis-browser/`, `components/modules/redis-workspace/`, `components/base/tree-folder/FileTree.vue` (shared), `server/api/redis/`, `server/infrastructure/nosql/redis/`

## Context

Four independent enhancements to the Redis browser, gathered in one brainstorming pass since they touch the same files:

1. Sidebar tree loses focus/scroll sync on the selected key.
2. No way to delete a key (or a group of keys) from the sidebar tree.
3. Key detail panel feels slow when switching between keys.
4. `listRedisKeys` silently truncates results, so some keys never show up.

---

## 1. Sidebar focus/scroll sync

### Root cause

`ManagementRedisBrowser.vue` renders inside `<KeepAlive>` (`PrimarySideBar.vue`). When the panel is deactivated (user switches to Schemas, etc.) and `session.selectedKey` changes in the background (e.g. user switches to a different Redis tab in the top tab bar, which patches the shared `RedisWorkspaceSession.selectedKey`), the `watch(() => props.selectedKey, ...)` in `RedisKeyTree.vue` still fires (Vue keeps watchers running on deactivated components) and calls `focusItem(...)`, but the tree's DOM is detached, so `scrollToItem` silently does nothing. Nothing re-triggers the sync when the panel becomes visible again.

Separately, calling `focusItem` on every direct click is redundant: `FileTree.handleRowClick` already sets `selectedIds`/`focusedId` synchronously before emitting `click`, so the row is already highlighted. The extra `focusItem` call (with its `setTimeout(props.delayFocus)` + `scrollToItem`) adds a visible re-scroll/flicker the user doesn't want on a direct click.

### Fix

- `RedisKeyTree.vue`: introduce a local flag (e.g. `isLocalSelection`) set to `true` immediately before `emit('select', redisKey)` in `handleTreeClick`/`handleListClick`. In the existing `watch(() => props.selectedKey, ...)`, if the flag is set, reset it and skip `focusItem` (row is already visually selected). Otherwise (external change — tab switch, delete elsewhere, etc.) run `focusItem` as today.
- Add an `onActivated()` hook in `RedisKeyTree.vue`: whenever the component is (re)activated — including the very first mount, and every time the sidebar panel becomes visible again via `KeepAlive` — if `props.selectedKey` is set, call `focusItem` on the active ref (`fileTreeRef`/`flatTreeRef` depending on `viewMode`). This covers "switch away to Schemas, switch back to Redis Browser" and "select a different key's tab while the panel was hidden".
- No change needed to `FileTree.vue` for this item.

---

## 2. Delete key(s) via context menu + keyboard

### Behavior

- Right-click a key node in the tree → context menu with **Delete**. Always shows a confirm dialog.
- Right-click a group/folder node → context menu with **Delete N keys...**. Server enumerates the _full_ set of keys matching that group's prefix pattern (not just what's currently loaded in the sidebar — see item 4, since the sidebar now loads the full match set anyway). Dialog lists every key that will be removed, count included. Always confirmed — no keyboard bypass for bulk.
- Keyboard: pressing `Delete`/`Backspace` while a key row has tree focus opens the same confirm dialog as the context menu action. Pressing `Cmd+Delete` (mac) / `Ctrl+Delete` while a **single key** row has focus deletes immediately, no dialog. This bypass only applies to a single focused key, never to a focused group node.

### Implementation

- `components/base/tree-folder/FileTree.vue` (shared, additive only): add `delete: [nodeId: string, event: KeyboardEvent]` to the emits type. In `handleKeyDown`, add a case for `'Delete'` and `'Backspace'` that calls `event.preventDefault()` and `emit('delete', focusedId.value, event)`. This mirrors the existing `click`/`rename`/`contextmenu` emit pattern and doesn't change behavior for other consumers (Explorer, Schemas, UserRoles) unless they opt in.
- New composable `components/modules/management/redis-browser/hooks/useRedisTreeContextMenu.ts`, modeled on `useExplorerContextMenu.ts`: tracks the right-clicked node, builds `ContextMenuItem[]` ("Delete" for `kind: 'key'`, "Delete N keys..." for `kind: 'group'`), and exposes an `onDelete(nodeId, { immediate })` callback used by both the context menu action and the keyboard `delete` emit handler.
- `RedisKeyTree.vue`: wrap `FileTree` usage with `BaseContextMenu` (same pattern as `ManagementExplorerTree.vue`), wire `@contextmenu` → `onRightClickItem`, `@delete` → resolve node kind and call `onDelete` with `immediate: event.metaKey || event.ctrlKey` (only honored when the resolved node is a single key).
- New dialog `components/modules/redis-workspace/components/RedisDeleteKeyDialog.vue` (`AlertDialog`, same shape as `RedisBulkActionsDialog.vue`):
  - Single key: shows key name + type.
  - Group: shows the full resolved key list (scrollable) + count.
- Backend (`server/infrastructure/nosql/redis/redis-browser.service.ts`):
  - `deleteRedisKeys(input, keys: string[])`: uses `client.unlink(...)` (non-blocking — matters for large keys, per item 3's context) chunked in batches (e.g. 500 keys per command) instead of `DEL`.
  - Group preview reuses the "fetch full match set" scan from item 4 (`listRedisKeys` with the group's prefix pattern, unlimited).
- New routes:
  - `server/api/redis/browser/value.delete.ts` — single key delete.
  - `server/api/redis/browser/keys.delete.ts` — bulk delete, accepts an explicit `keys: string[]` (exactly what the dialog showed — avoids re-scanning and a TOCTOU mismatch between preview and delete).
- Client (`useRedisWorkspaceBrowser.ts`): add `deleteKey`/`deleteKeys` methods — call the new endpoints, remove deleted keys from local `keys.value`, clear `selectedKey`/`selectedKeyDetail` (and cache entry, item 3) if the deleted key was selected, close any open tab pointing at a deleted key.

---

## 3. Key detail feels slow switching between keys

### Root cause

Confirmed with the user: the complaint is specifically that switching back and forth between keys always re-fetches over the network — there's no client-side cache, so every click pays full round-trip latency again even for a key just viewed seconds ago.

Secondary (still worth fixing, lower priority): `buildRedisKeyDetail` in `redis-browser.service.ts` does 6 sequential Redis round-trips per key (`type` → `ttl` → `value` → `memoryUsage` → `length` → `encoding`), each one `await`ed in sequence, when several are independent.

### Fix

- `useRedisWorkspaceBrowser.ts`: add an in-memory `Map<string, RedisKeyDetail>` cache keyed by `` `${session.selectedDatabaseIndex}:${key}` ``. `refreshSelectedKeyDetail(key)` checks the cache first — if present, sets `selectedKeyDetail` immediately with no loading state and no network call. The existing manual "Refresh" button and auto-refresh toggle in `RedisValueEditor.vue` still force a real fetch and overwrite the cache entry (explicit escape hatch, no silent staleness surprises).
  - Cache invalidation points: on successful `saveSelectedValue` (already have the fresh detail from the PATCH response — write it into the cache), on key delete (item 2 — remove entry), and on database/connection switch (clear the whole map, since it's keyed per session anyway so a fresh session naturally starts empty).
- `redis-browser.service.ts`: in `buildRedisKeyDetail`, keep `type` as the first sequential call (everything else depends on knowing the type), then run `ttl`, `readRedisValue`, `getRedisMemoryUsage`, `getRedisEncoding` concurrently via `Promise.all`, then `getRedisLength` after (it needs the resolved `value`). Pure latency optimization, no behavior/output change.
- `RedisValueEditor.vue`: add a **Delete** button in the header actions row (next to Refresh/Auto-refresh), wired to the same delete flow and confirm dialog from item 2. Always confirms — it's an explicit click, no keyboard-bypass path here.

Explicitly out of scope for this pass (flagged, not actioned): `hGetAll`/`sMembers` in `readRedisValue` are unbounded for hash/set types (unlike list/zset, which already cap at 200), so a hash/set with tens of thousands of fields will still be slow on first (uncached) load. Not fixing now per user direction to focus on the caching complaint.

---

## 4. `listRedisKeys` silently drops keys

### Root cause

`listRedisKeys` in `redis-browser.service.ts` computes `requestedKeyCount = Math.max(options?.count ?? 500, 100)` and stops scanning once that many keys are collected — there is no cursor/pagination surfaced in the UI, so any database with more than 500 matching keys is silently truncated. Both Tree and List views read from the same truncated `keys` array.

### Fix (MVP — correctness first, per user direction)

- Remove the low default cap. Loop the existing `SCAN` cursor loop until the cursor is exhausted (`cursor === '0'`), collecting every matching key instead of stopping early.
- Keep a generous safety ceiling (e.g. 20,000 keys) purely to prevent an unbounded request against a pathologically huge keyspace from hanging the UI — not a normal-case limit. If the ceiling is hit, surface that clearly (e.g. a flag on the response) rather than truncating silently the way the current 500-cap does.
- No other change needed:
  - Tree and List views already share the same fully-loaded `keys` array, so both become complete once the cap is gone.
  - Search filtering in `useRedisTreeData.ts` (`visibleKeys` computed) already filters over the full in-memory `keys.value` array, not over what `FileTree`'s virtualization currently renders on screen — so search already finds any loaded key regardless of scroll position, with no extra work.
- Real cursor-based pagination / "load more" UI is explicitly deferred to a follow-up enhancement, per user direction ("MVP trước, đúng trước, tối ưu sau").

---

## Cross-cutting notes

- Items 2 and 3 share the delete flow/dialog — build it once (`RedisDeleteKeyDialog.vue` + `deleteKey`/`deleteKeys` in `useRedisWorkspaceBrowser.ts`), consume from both the tree context menu/keyboard shortcut and the key detail panel's Delete button.
- Item 2's group-delete preview and item 4's "fetch full match set" are the same underlying capability (uncapped `listRedisKeys` scan by pattern) — no duplicate server logic needed.
- `UNLINK` (item 2) matters specifically because item 4 means the tree can now hold very large key sets, and a large individual key's synchronous `DEL` could block the Redis event loop.

## Testing

- Unit: `useRedisWorkspaceBrowser.ts` cache behavior (hit/miss, invalidation on save/delete/db-switch), `listRedisKeys` uncapped scan + safety ceiling, `deleteRedisKeys` chunking.
- Nuxt/component: `RedisKeyTree.vue` focus-on-activate behavior, delete keyboard shortcut (`Delete` vs `Cmd/Ctrl+Delete`) dispatch, `RedisDeleteKeyDialog.vue` single vs group rendering.
- Existing `test/nuxt/components/modules/redis-workspace/RedisValueEditor.test.ts` needs updating for the new Delete button.
