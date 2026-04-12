# UI Contract: Status Bar Update Indicator

**Component**: `ElectronUpdateIndicator.vue`  
**File**: `components/modules/app-shell/status-bar/components/ElectronUpdateIndicator.vue`  
**Feature**: 014-enhance-electron-updater

---

## Summary

The existing `ElectronUpdateIndicator` renders a trigger button in the status bar and a popover detail card. It must be enhanced to show download progress percentage in the trigger label and a visual progress bar inside the popover, plus Cancel/Retry actions during stalled or in-progress downloads.

---

## State consumed from `useElectronUpdater()`

| State                | Type                  | Used for                                                   |
| -------------------- | --------------------- | ---------------------------------------------------------- |
| `status`             | `Ref<UpdateState>`    | Drives which UI variant is shown                           |
| `downloadProgress`   | `Ref<number>`         | Percentage (0–100) shown in trigger label and progress bar |
| `downloadedBytes`    | `Ref<number \| null>` | Bytes downloaded (shown in popover detail)                 |
| `downloadTotalBytes` | `Ref<number \| null>` | Total bytes (shown in popover detail)                      |
| `isDownloadStalled`  | `Ref<boolean>`        | **New** — triggers stall UI (Cancel + Retry buttons)       |
| `lastError`          | `Ref<string \| null>` | Shown in popover error state                               |
| `isBusy`             | `Ref<boolean>`        | Disables action buttons                                    |
| `cancelDownload`     | `() => void`          | **New** — called by "Cancel" button during stall           |
| `retryDownload`      | `() => Promise<void>` | **New** — called by "Retry" button during stall/error      |

---

## Trigger Button States

| `status`           | `isDownloadStalled` | Label                     | Icon                          | Color class        |
| ------------------ | ------------------- | ------------------------- | ----------------------------- | ------------------ |
| `available`        | —                   | `v{version}`              | `hugeicons:arrow-up-01`       | `text-blue-500`    |
| `downloading`      | `false`             | `v{version} · {percent}%` | `hugeicons:download-04`       | `text-blue-500`    |
| `downloading`      | `true`              | `v{version} · stalled`    | `hugeicons:alert-circle`      | `text-yellow-500`  |
| `ready-to-restart` | —                   | `Restart to update`       | `hugeicons:package-delivered` | `text-green-500`   |
| `error`            | —                   | `v{version}`              | `hugeicons:alert-circle`      | `text-destructive` |

---

## Popover Body States

### Downloading (not stalled)

```
[ Title: "Update X.Y.Z is available" ]
[ "Current version: ..." ]
[ "Published: ..." ]

[ Progress bar: <Progress :value="downloadProgress" /> ]      ← NEW
[ "Downloaded: {bytes} / {total}" ]

[ Button: "Downloading…" (disabled, full width) ]
```

### Downloading + Stalled

```
[ Title: "Update X.Y.Z — download stalled" ]
[ "Current version: ..." ]

[ Progress bar: <Progress :value="downloadProgress" /> ]
[ "Downloaded: {bytes} / {total}" ]
[ "Download appears to have stopped." ]                       ← NEW

[ Button: "Cancel" (secondary, left) | Button: "Retry" (primary, right) ]  ← NEW
```

### Error

```
[ Title: "Update X.Y.Z — download failed" ]
[ Error message: {lastError} in text-destructive ]

[ Button: "Retry download" (full width) ]
```

### Ready to Restart

```
[ Title: "Update X.Y.Z is ready" ]
[ "Current version: ..." ]
[ "Published: ..." ]
[ Release notes ]

[ Button: "Restart & install" (full width) ]
```

---

## Progress Bar Component

Use `<Progress :value="downloadProgress" class="h-1.5" />` from `shadcn-vue` (already available in the project). Shown only when `status === 'downloading'`.

---

## Accessibility

- Progress bar must include `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"` (handled by shadcn `<Progress>`).
- Stall/error states should not auto-close the popover — the user must explicitly act.
- "Cancel" and "Retry" must be keyboard-reachable within the popover.
