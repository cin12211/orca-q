# Research: Enhanced Electron App Updater

**Phase**: 0 — Resolve unknowns before Phase 1 design  
**Date**: 2026-04-12  
**Feature**: 014-enhance-electron-updater

---

## 1. electron-updater Download Cancellation API

### Question

Can an in-progress download triggered by `autoUpdater.downloadUpdate()` be cancelled at the Electron main process level?

### Research Findings

`electron-updater` v6.x does not expose an official cancellation token or abort API. Once `autoUpdater.downloadUpdate()` is called, the download proceeds internally until complete, error, or process termination. The `downloadUpdate()` call returns a `Promise<string[]>` with no `.cancel()` method.

### Decision

**Cancel is UI-level only.** When the user clicks "Cancel":

1. The renderer composable resets the downloading state back to `available`.
2. The status bar indicator disappears (treated as if download never started).
3. The underlying HTTP transfer may continue briefly in the Electron process but is orphaned — it will complete silently or be cleaned up on the next app launch via electron-updater's own temp-file management.

**Rationale**: The UX expectation is met (the user sees no more progress; can choose to re-download later). Installing without a complete download is prevented by electron-updater requiring the package to be fully present before calling `quitAndInstall()`.

**Alternatives considered**: Killing the Electron subprocess — rejected as too destructive. Using a mocked cancel signal — rejected as brittle and unsupported.

---

## 2. Skip-Version Persistence: Renderer-Side vs Main Process

### Question

Should the skipped-version preference be stored on the Electron main process (requiring new IPC channels) or can it be stored from the renderer using the existing persist API?

### Research Findings

The existing `window.electronAPI.persist` surface (contextBridge IPC) exposes:

- `persist.upsert(collection, id, value)` — write any record
- `persist.getOne(collection, id)` — read a record by id

These are backed by `electron-store` on the main process (`electron/persist/store.ts`) using the `appConfig` collection. The renderer can freely read/write to `appConfig` using a well-known record `id`.

The skip state is a **presentation decision**: the renderer receives the real version from Electron and decides whether to surface the dialog. The Electron main process always sends honest `update-available` events — it is never told to suppress anything. This preserves the main process as the single source of truth on what version is available.

### Decision

**Store skip preference renderer-side** via `persist.upsert('appConfig', 'updater.skippedVersion', { version })` and `persist.getOne('appConfig', 'updater.skippedVersion')`. Read on `update-available` event, before deciding whether to set `startupPromptOpen = true`.

**Rationale**: No new IPC channels required. The main process integrity is preserved. Aligns with the existing persist layer pattern seen throughout the codebase.

**Alternatives considered**: New dedicated `updater:get-skip` / `updater:set-skip` IPC handlers — rejected as over-engineering for a simple flag that has no security implications.

---

## 3. Semver Comparison Without a New Dependency

### Question

How to determine whether the available version is "newer than" the skipped version (to clear the skip state) without adding the `semver` npm package as a direct renderer dependency?

### Research Findings

The `semver` package is already present in `node_modules` as a transitive dependency of several packages, but it is not a declared direct dependency in `package.json` and is not tree-shaken to the renderer bundle reliably.

Version strings from electron-updater follow strict SemVer (`"1.2.3"`, `"2.0.0-beta.1"`). A three-part numeric comparison handles all production release cases. Pre-release suffixes (`-beta.1`) need not be compared precisely — the rule is: if the available version is the same string, suppress; if it is anything different (newer production or pre-release), show the dialog.

### Decision

**Use exact string equality for suppression; use a simple inline `compareVersions` helper for "is newer" detection.**

```typescript
// Inline helper — no external dependency
function compareVersionTuples(a: string, b: string): number {
  const parse = (v: string) => v.replace(/-.*$/, '').split('.').map(Number);
  const [aMajor, aMinor, aPatch] = parse(a);
  const [bMajor, bMinor, bPatch] = parse(b);
  if (aMajor !== bMajor) return aMajor - bMajor;
  if (aMinor !== bMinor) return aMinor - bMinor;
  return aPatch - bPatch;
}

// Usage:
// if available === skipped → suppress (exact match)
// if compareVersionTuples(available, skipped) > 0 → clear skip, show dialog
```

Pre-release versions (`1.2.3-beta.1`) have their suffix stripped before comparison. This means a `-beta.2` of the same version as the skipped one will be suppressed — acceptable for this feature's scope.

**Alternatives considered**: `import { gt } from 'semver'` — rejected to avoid adding a direct dependency.

---

## 4. Stall Detection Interval

### Question

What is an appropriate "stall timeout" after which the download is considered stuck?

### Research Findings

electron-updater emits `download-progress` events approximately every 1 second during active downloads. Network timeouts in typical home/office environments can range from 10–90 seconds without visible progress. Desktop app updaters (GitHub Desktop, VS Code) typically surface a "taking longer than expected" message after 30–60 seconds of no progress.

### Decision

**30-second stall threshold.** If `downloadProgress` (`percent`) does not change for 30 consecutive seconds, set `isDownloadStalled = true` and surface Cancel/Retry in the status bar. Reset the timer on every progress event. Reset `isDownloadStalled` to `false` on Cancel or Retry.

**Rationale**: Balances responsiveness (users notice a stuck download quickly) vs false positives (slow connections on large packages may appear stalled for 20–25s).

**Alternatives considered**: 60 seconds — too long for user perception; 10 seconds — too many false positives on slow connections.

---

## 5. Restart-Ready Prompt on Re-launch

### Question

When the user exits the dialog with "Later" from the restart-ready prompt and relaunches the app, which dialog should appear?

### Research Findings

The existing `checkForUpdates()` call in `checkForElectronUpdatesOnStartup()` uses `promptIfAvailable: true`. The Electron main process caches `cachedReadyUpdate` across the session. On a fresh app launch, `api.check()` returns `status: 'ready'` if the download is complete, triggering `setReadyUpdate()` in the composable.

### Decision

**Show the restart-ready prompt** (two-button: Restart now / Later). `isRestartPrompt` is already derived from `readyToRestartUpdate.value`. On re-launch, the check resolves `status: 'ready'` → `readyToRestartUpdate` is set → `startupPromptOpen = true` → dialog shows with restart UI. No extra logic needed.

---

## 6. Status Bar Indicator — Progress Bar Visual

### Question

Should the progress bar be shown inside the popover, in the trigger button itself, or as a separate element?

### Research Findings

The existing `ElectronUpdateIndicator.vue` uses a `<Popover>` pattern: a small trigger button in the status bar, and an expanded detail card on click. The trigger button currently shows only an icon + version string. Adding a progress `%` suffix to the trigger text (e.g., `v1.2.0 · 47%`) plus a horizontal progress bar inside the popover detail card is the lowest-effort, most consistent approach.

### Decision

- **Trigger button**: append `· {percent}%` to the label when `status === 'downloading'`.
- **Popover body**: add a `<Progress>` component (already available via shadcn-vue) below the release notes, visible during `downloading` and `error` states.

**Alternatives considered**: Adding a thin progress line to the button itself (too small, poor contrast) — rejected. A separate status bar progress track (requires StatusBar layout changes) — rejected as over-engineering.
