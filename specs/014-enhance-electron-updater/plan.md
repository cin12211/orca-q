# Implementation Plan: Enhanced Electron App Updater

**Branch**: `014-enhance-electron-updater` | **Date**: 2026-04-12 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/014-enhance-electron-updater/spec.md`

## Summary

Enhance the Electron auto-updater UX by replacing the two-button startup dialog with a three-option dialog (Download / Later / Skip this version), adding a visual download progress bar to the existing status bar indicator, and adding stall detection with Cancel/Retry actions. The skip-version preference is persisted via the existing renderer-accessible `appConfig` persist collection. No new Electron IPC channels are needed.

## Technical Context

**Language/Version**: TypeScript 5.x (Electron main process + Nuxt 3 / Vue 3 renderer)  
**Primary Dependencies**: Electron 30+, electron-updater 6.x, Vue 3 Composition API, Pinia, shadcn-vue component library, vue-sonner (toast)  
**Storage**: electron-store (Electron main process) accessed from renderer via existing contextBridge IPC persist layer (`appConfig` collection)  
**Testing**: Vitest (unit tests for composable logic), no E2E for this feature  
**Target Platform**: macOS + Windows desktop (Electron app with Nuxt 3 renderer)  
**Project Type**: Desktop application (Electron + Nuxt 3 SPA renderer)  
**Performance Goals**: Progress indicator updates within 500ms of IPC progress event; dialog responds within 100ms of user action  
**Constraints**: No new Electron IPC channels; no new npm dependencies; download cancellation is UI-level only (electron-updater has no official cancel API)  
**Scale/Scope**: Single-user desktop app; updater composable is module-level singleton (shared state)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

The project constitution file is a blank template — no project-specific gates are defined. The following standard engineering gates apply:

| Gate                                                                            | Status  | Notes                                                                                |
| ------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------ |
| No new npm dependencies introduced                                              | ✅ Pass | Semver comparison will use an inline helper (no `semver` package needed in renderer) |
| No new IPC channels (skip stored renderer-side via existing persist API)        | ✅ Pass | `appConfig` collection already accessible from renderer                              |
| No new services layer (enhancement of existing composable + two Vue components) | ✅ Pass | —                                                                                    |
| Skip-version logic does not bypass Electron main process trust boundary         | ✅ Pass | Logic is presentation-only; Electron main always emits real version data             |
| Download cancellation limitation documented                                     | ✅ Pass | Documented in research.md                                                            |

## Project Structure

### Documentation (this feature)

```text
specs/014-enhance-electron-updater/
├── plan.md              ← This file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/           ← Phase 1 output
│   ├── dialog-update-available.md
│   └── status-bar-indicator.md
└── tasks.md             ← Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
core/
└── composables/
    └── useElectronUpdater.ts          ← Add: skipVersion(), isDownloadStalled, stall timer, skip-persist logic

components/modules/app-shell/status-bar/
└── components/
    ├── ElectronUpdateStartupDialog.vue ← Change: add "Skip this version" third button
    └── ElectronUpdateIndicator.vue     ← Change: add progress bar, stall Cancel/Retry buttons
```

**Structure Decision**: No new files required. All changes are surgical enhancements to two existing Vue components and one existing composable. The architecture module boundary is preserved: composable handles all logic; components remain pure UI.

## Complexity Tracking

No constitution violations detected. No complexity justification required.
