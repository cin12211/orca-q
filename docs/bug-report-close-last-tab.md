# Bug Report: Close Last Tab Runtime Error

**Affected action:** closing the final open tab in the tab bar  
**Affected file:** `core/stores/useTabViewsStore.ts`  
**Date:** 2026-03-24  
**Status:** Fixed

---

## Error Seen

When the last tab was closed, Vue reported a component update error:

```json
{
  "error": {},
  "info": "component update",
  "instance": {
    "name": "default"
  }
}
```

This happened during the transition from a tab-backed page such as:

- `/:workspaceId/:connectionId/quick-query/:tabViewId`
- `/:workspaceId/:connectionId/agent/:tabViewId`
- other routes driven by the tab store

---

## Why The Bug Existed

### 1. The active tab was removed before the route finished leaving it

`closeTab()` deleted the active tab from persistence and removed it from
`tabViews` immediately. If that tab was the page currently being rendered,
Vue still had one update cycle where the route component existed but its
backing tab record was already gone.

That created a short invalid state:

1. The route still pointed at the tab page.
2. The tab store no longer contained the tab for that route.
3. Tab-backed components updated while their context disappeared.

That transition is what produced the Vue `component update` error.

### 2. The fallback navigation was incomplete

When the store navigated back to the connection root, it used the named route
`workspaceId-connectionId` without always passing the required route params.

That made the recovery path unreliable exactly when the app was already in a
bad state.

### 3. Tab deletion used global state instead of the tab being closed

`closeTab()` used `wsStateStore.schemaId` and the current `connectionId`
instead of the values stored on the tab record being removed.

That was harder to reason about and made the delete path depend on external
state that could already be changing during navigation.

---

## Fix Applied

### 1. Navigate away first, then remove the closing tab

The close flow now works in this order for the active tab:

1. If another tab exists, navigate to that tab first.
2. If no tab remains, clear the active `tabViewId` and navigate to the
   connection root.
3. Only after the route is safe, delete the tab from persistence and remove it
   from `tabViews`.

This avoids the route component being updated while its tab data is already
missing.

### 2. Added a dedicated connection-root navigation helper

`navigateToConnectionRoot()` now always sends:

- `workspaceId`
- `connectionId`
- `replace: true`

That makes the fallback route deterministic and easier to reuse.

### 3. Tab actions now use the tab record itself

Deletion now uses the tab's own:

- `workspaceId`
- `connectionId`
- `schemaId`
- `id`

This keeps the close logic tied to the tab being acted on instead of unrelated
store state.

### 4. Refactor for readability and safer edge cases

The store now has small helpers for:

- looking up a tab
- building delete payloads
- removing tabs from local state
- deleting one tab or many tabs from persistence
- finding the adjacent tab to activate

As part of that cleanup, `closeOtherTab()` and `closeToTheRight()` also now
guard against missing tab ids before mutating state.

---

## Files Changed

- `core/stores/useTabViewsStore.ts`

---

## Verification

- `npm run typecheck` passed
- Manual runtime verification is still recommended in the UI:
  - open one tab
  - close it
  - repeat with several tabs and close the active one
  - run `Close other` and `Close to the right`
