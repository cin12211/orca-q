# Bug 2 Report: Desktop app always shows `What's New` on every launch

## Symptom

On the desktop app, `What's New` re-opened every time the app started, even after the user had already dismissed it.

## Root Cause

The "last seen changelog version" key is stored through `getPlatformStorage()`.  
On Tauri, that adapter wrote with fire-and-forget async calls:

- `setItem()` only queued `store.set(...)`
- `removeItem()` only queued `store.delete(...)`

There was no explicit `save()` flush. That made the in-memory value look correct during the current session, but the value could fail to reach disk reliably before the next launch.

## Fix Summary

- Updated the Tauri platform storage adapter to explicitly call `save()` after every `setItem()` and `removeItem()`.
- This makes the `orcaq-last-seen-version` write durable across app restarts.

## Files Changed

- `core/persist/storage-adapter.ts`
  - `setItem()` now does `set(...)` + `save()`.
  - `removeItem()` now does `delete(...)` + `save()`.

## Why This Fix Is Correct

`useChangelogModal()` already uses `getPlatformStorage()` consistently for:

- reading the last seen version
- writing the last seen version

So the real problem was durability of the storage write on desktop, not the changelog modal logic itself.

## Validation

- The storage adapter change compiles in the TypeScript scope used for changed files.
- The same adapter is also now safer for any other Tauri KV writes using `getPlatformStorage()`.
