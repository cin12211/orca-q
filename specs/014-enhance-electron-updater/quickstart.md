# Quickstart: Enhanced Electron App Updater

**Feature**: 014-enhance-electron-updater  
**Date**: 2026-04-12

---

## What This Feature Changes

Three changes to two existing Vue components and one composable. No new files are created; no new npm dependencies are introduced.

---

## Files Modified

| File                                                                                 | Change                                                                                                                                                        |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `core/composables/useElectronUpdater.ts`                                             | Add `skipVersion()`, `cancelDownload()`, `retryDownload()`, `isDownloadStalled`, `skippedVersion` state, stall timer logic, and persist-read in startup check |
| `components/modules/app-shell/status-bar/components/ElectronUpdateStartupDialog.vue` | Add "Skip this version" third button in Variant A (update-available)                                                                                          |
| `components/modules/app-shell/status-bar/components/ElectronUpdateIndicator.vue`     | Add `<Progress>` bar, percent suffix in trigger, stall Cancel/Retry buttons                                                                                   |

---

## Developer Walkthrough

### 1. Skip-Version Logic in the Composable

In `useElectronUpdater.ts`:

1. Add module-level `const skippedVersion = ref<string | null>(null)`.
2. In `checkForUpdates()` — before setting `startupPromptOpen = true` — read the stored skip record:
   ```ts
   const skipRecord = await api_persist.getOne(
     'appConfig',
     'updater.skippedVersion'
   );
   const skipped = (skipRecord as any)?.version ?? null;
   skippedVersion.value = skipped;
   ```
3. Compare: if `result.updateInfo.version === skipped`, do not open the prompt. If the available version is newer (use inline `compareVersionTuples`), proceed normally (the skip is implicitly ignored by the exact-match check failing).
4. Add `skipVersion(version: string)` function: calls `persist.upsert(...)`, closes prompt.
5. Add stall timer: on each `onProgress` callback, clear + restart a 30s `setTimeout` — on timeout, set `isDownloadStalled = true`.
6. Add `cancelDownload()`: reset `isDownloading = false`, `status = 'available'`, `isDownloadStalled = false`, clear timer.
7. Add `retryDownload()`: reset stall, call `startDownload()`.
8. Expose all new refs/functions from the `return` object.

### 2. Three-Button Dialog

In `ElectronUpdateStartupDialog.vue`:

1. Import `skipVersion` from `useElectronUpdater()`.
2. In `<AlertDialogFooter>` when `!isRestartPrompt`:
   - Add a ghost/link-style button for "Skip this version" (leftmost, calls `skipVersion(displayUpdate.version)` then `dismissStartupPrompt()`).
   - Keep "Later" and the primary CTA ("Download update").

### 3. Progress Bar in Indicator

In `ElectronUpdateIndicator.vue`:

1. Import `downloadProgress`, `isDownloadStalled`, `cancelDownload`, `retryDownload` from composable.
2. In the trigger button label: when `status === 'downloading'`, append `· {downloadProgress}%`.
3. When stalled, change label to `stalled` and icon color to yellow.
4. Inside `<PopoverContent>`:
   - Add `<Progress :value="downloadProgress" class="h-1.5 w-full" />` below the release notes, visible when `status === 'downloading'`.
   - When `isDownloadStalled`, show stall message and Cancel/Retry buttons.

---

## Testing Approach

### Unit tests — `useElectronUpdater.ts`

Cover these scenarios with Vitest + mocked `window.electronAPI`:

| Scenario                                                        | Assertion                                                             |
| --------------------------------------------------------------- | --------------------------------------------------------------------- |
| `checkForUpdates()` — available version matches skipped version | `startupPromptOpen` stays `false`                                     |
| `checkForUpdates()` — available version is newer than skipped   | `startupPromptOpen` becomes `true`                                    |
| `skipVersion('1.2.0')` called                                   | `persist.upsert` called with `{ version: '1.2.0' }` and prompt closes |
| Progress events stop for 30s                                    | `isDownloadStalled` becomes `true`                                    |
| Progress event arrives after stall                              | `isDownloadStalled` becomes `false`                                   |
| `cancelDownload()` called                                       | `status` → `'available'`, `isDownloading` → `false`                   |

### Manual verification checklist

- [ ] New version available: dialog shows three buttons (Skip / Later / Download)
- [ ] "Skip this version" dismisses dialog; re-launch does NOT show dialog for same version
- [ ] Newer version after skip: dialog appears again
- [ ] "Later": dialog closes; re-launch shows dialog again
- [ ] "Download": dialog closes, status bar shows `v{version} · {x}%`
- [ ] Progress bar updates in popover
- [ ] Simulate stall (debug: set stall timeout to 5s): indicator shows "stalled", Cancel/Retry appear
- [ ] "Retry" resumes download; "Cancel" resets to available state
- [ ] Download error: error message shown in popover
- [ ] Download completes: "Restart to update" shown in status bar
- [ ] "Restart now": app relaunches into new version
- [ ] Restart-ready + "Later" + relaunch: restart-ready prompt appears (not three-option)
