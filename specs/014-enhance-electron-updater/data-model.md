# Data Model: Enhanced Electron App Updater

**Phase**: 1 — Design  
**Date**: 2026-04-12  
**Feature**: 014-enhance-electron-updater

---

## Entities

### 1. `SkippedVersionRecord` — Persisted

Stored in the `appConfig` electron-store collection under the fixed record ID `updater.skippedVersion`.

| Field     | Type     | Description                                           |
| --------- | -------- | ----------------------------------------------------- |
| `id`      | `string` | Always `"updater.skippedVersion"` (fixed record key)  |
| `version` | `string` | SemVer string of the skipped version (e.g. `"1.2.3"`) |

**Lifecycle:**

- Created/overwritten when user clicks "Skip this version".
- Read at update-available time to decide whether to show the startup dialog.
- Implicitly superseded when a newer version becomes available (not deleted — comparison short-circuits display logic).

**Persistence layer:** `window.electronAPI.persist.upsert('appConfig', 'updater.skippedVersion', { version })`

---

### 2. `UpdateState` — Transient (renderer ref)

Held in `useElectronUpdater` module-level reactive state. Not persisted — rehydrated on each app launch via `checkForUpdates()`.

| Value              | Description                                     |
| ------------------ | ----------------------------------------------- |
| `idle`             | No check performed yet this session             |
| `checking`         | `api.check()` in flight                         |
| `available`        | New version detected; waiting for user decision |
| `downloading`      | `api.download()` in progress                    |
| `ready-to-restart` | Download complete; restart required to install  |
| `restarting`       | `api.install()` called; app is relaunching      |
| `error`            | Download or check-for-updates failed            |
| `up-to-date`       | Latest version is already installed             |

---

### 3. `DownloadProgress` — Transient (renderer ref)

Held in `useElectronUpdater`. Populated from Electron IPC `updater:progress` events.

| Field                | Type             | Source                         |
| -------------------- | ---------------- | ------------------------------ |
| `downloadProgress`   | `number` (0–100) | `Math.round(progress.percent)` |
| `downloadedBytes`    | `number \| null` | `progress.transferred`         |
| `downloadTotalBytes` | `number \| null` | `progress.total`               |

---

### 4. `StallState` — Transient (renderer ref)

New reactive state added to `useElectronUpdater`. Drives Cancel/Retry UI in the indicator.

| Field               | Type             | Description                                                           |
| ------------------- | ---------------- | --------------------------------------------------------------------- |
| `isDownloadStalled` | `boolean`        | `true` after 30s with no `downloadProgress` change during downloading |
| `_stallTimer`       | `number \| null` | Internal `setTimeout` handle; reset on every progress event           |
| `_lastProgressPct`  | `number`         | Last known percent value; used to detect stall (internal only)        |

---

## State Transitions

```
idle
  └─[checkForUpdates]─→ checking
                           ├─[up-to-date]─→ up-to-date
                           ├─[available, not skipped]─→ available
                           │                              ├─[download]─→ downloading
                           │                              │                ├─[progress events]─→ downloading (progress updates)
                           │                              │                ├─[30s no progress]─→ downloading + stalled=true
                           │                              │                │                      ├─[retry]─→ downloading + stalled=false
                           │                              │                │                      └─[cancel]─→ available + stalled=false
                           │                              │                ├─[complete]─→ ready-to-restart
                           │                              │                └─[error]─→ error
                           │                              ├─[later]─→ idle (prompt closed, no persist)
                           │                              └─[skip]─→ idle (prompt closed, version persisted)
                           └─[available, skipped version]─→ idle (suppress prompt silently)
```

---

## Persistence Access Patterns

| Operation             | Caller               | IPC Call                                                                                |
| --------------------- | -------------------- | --------------------------------------------------------------------------------------- |
| Read skipped version  | `useElectronUpdater` | `persist.getOne('appConfig', 'updater.skippedVersion')` → `{ version: string } \| null` |
| Write skipped version | `useElectronUpdater` | `persist.upsert('appConfig', 'updater.skippedVersion', { version })`                    |

The read happens during `checkForUpdates()` before deciding to open `startupPromptOpen`. No new IPC channel is required.
