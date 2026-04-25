# UI Contract: Update Available Dialog

**Component**: `ElectronUpdateStartupDialog.vue`  
**File**: `components/modules/app-shell/status-bar/components/ElectronUpdateStartupDialog.vue`  
**Feature**: 014-enhance-electron-updater

---

## Summary

This component renders a modal `<AlertDialog>` when `startupPromptOpen` is true. It must be enhanced to support a third "Skip this version" action when in the **update-available** (non-restart) state.

---

## Props / State consumed from `useElectronUpdater()`

| State                  | Type                                 | Used for                                               |
| ---------------------- | ------------------------------------ | ------------------------------------------------------ |
| `startupPromptOpen`    | `Ref<boolean>`                       | Controls dialog visibility                             |
| `availableUpdate`      | `Ref<ResolvedUpdateInfo \| null>`    | Version number, release body for display               |
| `readyToRestartUpdate` | `Ref<ResolvedUpdateInfo \| null>`    | Determines restart-prompt vs update-available variant  |
| `isBusy`               | `Ref<boolean>`                       | Disables primary action button during download/restart |
| `dismissStartupPrompt` | `() => void`                         | Called by "Later"                                      |
| `installUpdate`        | `() => Promise<void>`                | Called by "Download" (starts download)                 |
| `restartToApplyUpdate` | `() => Promise<void>`                | Called by "Restart now"                                |
| `skipVersion`          | `(version: string) => Promise<void>` | **New** — called by "Skip this version"                |

---

## Variants

### Variant A — Update Available (non-restart)

`isRestartPrompt === false`

**Title**: `Update {{ availableUpdate?.version }} is available`

**Body**: `A newer desktop build is available. Current version: {{ displayUpdate?.currentVersion }}.` + optional `{{ displayUpdate?.body }}` release notes.

**Footer actions (left → right)**:

| Button            | Variant    | Action                                                            | Disabled      |
| ----------------- | ---------- | ----------------------------------------------------------------- | ------------- |
| Skip this version | Ghost/Link | `skipVersion(availableUpdate.version)` + `dismissStartupPrompt()` | When `isBusy` |
| Later             | Outline    | `dismissStartupPrompt()`                                          | Never         |
| Download          | Primary    | `installUpdate()`                                                 | When `isBusy` |

> **Layout note**: Three buttons in the footer. "Skip this version" is visually de-emphasized (ghost/link style or secondary outline, placed leftmost). "Download" is the primary CTA on the right.

### Variant B — Restart Ready

`isRestartPrompt === true`

**No changes from current implementation.** Retains two-button layout (Later / Restart now).

---

## Emits / Side Effects

- `skipVersion()` → persists skipped version, dialog closes. No state other than `startupPromptOpen` changes in the composable at the component level.
- `installUpdate()` → triggers download, dialog closes (the `startupPromptOpen` should be set to `false` when download starts).
- `dismissStartupPrompt()` → sets `startupPromptOpen = false`. No persistence.

---

## Accessibility

- All three buttons must be reachable via keyboard Tab order.
- Primary action ("Download" / "Restart now") must have `autofocus` or be the natural focus target.
- Dialog must trap focus while open (`AlertDialog` from shadcn-vue handles this by default).
