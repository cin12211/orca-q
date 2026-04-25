# Tasks: Enhanced Electron App Updater

**Input**: Design documents from `/specs/014-enhance-electron-updater/`  
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅ quickstart.md ✅

**Tests**: Not explicitly requested — no test tasks generated.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

**Revision (2026-04-12)**: Task descriptions for T006 and T010 were corrected to use `persistGetOne` / `persistUpsert` from `~/core/persist/adapters/electron/primitives` (the project-standard electron persist layer) instead of a bespoke `persistAPI()` helper. No new adapter file is created. A Corrections phase (T027–T029) is added at the front of the remaining work.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no block on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths are included in all descriptions

---

## Phase 0: Corrections (Blocking — must run before remaining work)

**Purpose**: The previous implementation of T006 and T010 used an ad-hoc `persistAPI()` helper that re-implemented the raw contextBridge path. The project already has `persistGetOne` / `persistUpsert` primitives in `~/core/persist/adapters/electron/primitives` that handle all electron-store IPC. These three tasks correct that approach without creating a new adapter file.

**Persist target**: `'appConfig'` collection, record ID `'updater-skipped-version'`, shape `{ version: string }`.

- [x] T027 In `core/composables/useElectronUpdater.ts`, remove the entire `persistAPI()` arrow-function helper (lines that define and export a typed wrapper around `window.electronAPI.persist`); add named imports at the top of the file: `import { persistGetOne, persistUpsert } from '~/core/persist/adapters/electron/primitives'`
- [x] T028 In `skipVersion(version: string)` inside `useElectronUpdater()` in `core/composables/useElectronUpdater.ts`, replace the `persistAPI()` call with `await persistUpsert<{ version: string }>('appConfig', 'updater-skipped-version', { version })`; on catch, silently fall through (behavior unchanged)
- [x] T029 [US1] In the `status: 'available'` guard inside `checkForUpdates()` in `core/composables/useElectronUpdater.ts`, replace the `persistAPI()` call with `const record = await persistGetOne<{ version: string }>('appConfig', 'updater-skipped-version')`; then `skippedVersion.value = record?.version ?? null` (behavior unchanged)

**Checkpoint**: `persistAPI()` helper is gone. All persist calls go through the established primitives layer. Zero raw `window.electronAPI.persist` references remain in the composable.

---

## Phase 1: Setup

**Purpose**: Read all design documents and verify current state of touched files before writing any code.

- [x] T001 Read `core/composables/useElectronUpdater.ts` in full to confirm current exported API surface
- [x] T002 [P] Read `components/modules/app-shell/status-bar/components/ElectronUpdateStartupDialog.vue` in full
- [x] T003 [P] Read `components/modules/app-shell/status-bar/components/ElectronUpdateIndicator.vue` in full

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add the composable-layer primitives that both US1 (skip-version dialog) and US2 (progress indicator) depend on. No UI changes yet.

**⚠️ CRITICAL**: US1 and US2 cannot be implemented until this phase is complete.

- [x] T004 Add `skippedVersion` module-level `ref<string | null>(null)` and `isDownloadStalled` module-level `ref<boolean>(false)` to `core/composables/useElectronUpdater.ts`
- [x] T005 Add stall-detection timer logic to `initializeUpdaterListeners()` in `core/composables/useElectronUpdater.ts`: clear + restart a 30-second `setTimeout` on every `onProgress` event; on timeout, set `isDownloadStalled.value = true`; clear timer on `onReady` and `onError`
- [x] T006 Add `skipVersion(version: string): Promise<void>` function to `useElectronUpdater()` in `core/composables/useElectronUpdater.ts`: wrap in try/catch — call `persistUpsert<{ version: string }>('appConfig', 'updater-skipped-version', { version })` (imported from `~/core/persist/adapters/electron/primitives`), then set `startupPromptOpen.value = false`; on any persist error, silently fall back to just closing the prompt. **⚠️ See T027–T028 for the correction to the persist call.**
- [x] T007 Add `cancelDownload(): void` function to `useElectronUpdater()` in `core/composables/useElectronUpdater.ts`: clear stall timer, set `isDownloading.value = false`, `status.value = 'available'`, `isDownloadStalled.value = false`, `downloadProgress.value = 0`
- [x] T008 Add `retryDownload(): Promise<void>` function to `useElectronUpdater()` in `core/composables/useElectronUpdater.ts`: clear stall, reset `isDownloadStalled.value = false`, then call `startDownload()`
- [x] T009 Expose `isDownloadStalled`, `skipVersion`, `cancelDownload`, `retryDownload` in the `return` object of `useElectronUpdater()` in `core/composables/useElectronUpdater.ts`

**Checkpoint**: Composable now exposes `skipVersion`, `cancelDownload`, `retryDownload`, `isDownloadStalled` — ready for US1 and US2 UI work. (Tasks renumbered: T005=stall timer, T006=skipVersion, T007=cancelDownload, T008=retryDownload, T009=expose; old T005 compareVersionTuples removed — exact-match bypass is the intentional design per FR-003.)

---

## Phase 3: User Story 1 — Three-Option Update Prompt (Priority: P1) 🎯 MVP

**Goal**: Replace the two-button startup dialog with a three-button dialog offering "Skip this version", "Later", and "Download". Skip state is persisted and suppresses subsequent prompts for the same version.

**Independent Test**: Mock `update-available` event with version `1.2.0`. Verify dialog renders all three buttons. Click "Skip this version" → dialog closes, no re-prompt for `1.2.0`. Mock same event again → no dialog. Mock version `1.3.0` event → dialog appears again.

### Implementation for User Story 1

- [x] T010 [US1] In `checkForUpdates()` in `core/composables/useElectronUpdater.ts`, before setting `startupPromptOpen.value = true` for `status: 'available'`, read the persisted skip record via `persistGetOne<{ version: string }>('appConfig', 'updater-skipped-version')` (imported from `~/core/persist/adapters/electron/primitives`) and extract `skippedVersion.value = record?.version ?? null`. **⚠️ See T029 for the correction to the persist call.**
- [x] T011 [US1] In the same `checkForUpdates()` guard block in `core/composables/useElectronUpdater.ts`, add condition: if `result.updateInfo.version === skippedVersion.value` then do NOT set `startupPromptOpen.value = true` (exact-match bypass per FR-003); otherwise proceed to open
- [x] T012 [US1] Update `ElectronUpdateStartupDialog.vue`: destructure `skipVersion` from `useElectronUpdater()`, add ghost-style "Skip this version" button (leftmost in footer) for the `!isRestartPrompt` variant calling `skipVersion(displayUpdate.version)`, with `:disabled="isBusy"` and visually de-emphasized styling (`class="text-muted-foreground"`)

**Checkpoint**: US1 fully functional — three-button dialog works, skip suppresses re-prompt for exact version, any other version string shows dialog normally (exact-match bypass per FR-003).

---

## Phase 4: User Story 2 — Download Progress Indicator (Priority: P2)

**Goal**: Show a live progress bar in the status bar indicator button and popover while downloading. Surface stall detection with Cancel/Retry. No blocking dialog during download.

**Independent Test**: Start a download. Verify trigger button shows `v{version} · {X}%`. Open popover — verify `<Progress>` bar updates. Force stall (debug: reduce timeout to 3s) — verify "Download appears to have stopped" + Cancel/Retry buttons appear. Click Cancel → indicator disappears, status resets to available.

### Implementation for User Story 2

- [x] T013 [P] [US2] In `ElectronUpdateIndicator.vue`, destructure `downloadProgress`, `isDownloadStalled`, `cancelDownload`, `retryDownload` from `useElectronUpdater()`
- [x] T014 [US2] In `ElectronUpdateIndicator.vue`, update the `<span>` label inside the trigger button: when `status === 'downloading'` and not stalled, append `· {{ downloadProgress }}%`; when stalled, show `v{{ displayUpdate?.version }} · stalled`
- [x] T015 [US2] In `ElectronUpdateIndicator.vue`, update `indicatorClass` computed: add case when `status === 'downloading' && isDownloadStalled` → `'text-yellow-500'`
- [x] T016 [US2] In `ElectronUpdateIndicator.vue`, update `indicatorIcon` computed: add case when `status === 'downloading' && isDownloadStalled` → `'hugeicons:alert-circle'`
- [x] T017 [US2] In `ElectronUpdateIndicator.vue` `<PopoverContent>`, add `<Progress :value="downloadProgress" class="h-1.5 w-full" />` directly below the `downloadProgressLabel` paragraph — visible only when `status === 'downloading'` (use `v-if`)
- [x] T018 [US2] In `ElectronUpdateIndicator.vue` `<PopoverContent>`, add stall message `<p v-if="isDownloadStalled" class="text-xs text-yellow-500">Download appears to have stopped.</p>` and two side-by-side buttons when stalled: Cancel (`cancelDownload()`) and Retry (`retryDownload()`); keep existing single-button logic otherwise. **FR-005 assertion**: confirm no `<AlertDialog>` or blocking modal is rendered during any state of this flow.

**Checkpoint**: US2 fully functional — live progress bar in indicator, stall detection with Cancel/Retry, no blocking dialogs during download (FR-005 verified inline in T018).

---

## Phase 5: User Story 3 — Restart-Ready Notification (Priority: P3)

**Goal**: Ensure the restart-ready flow is non-blocking and the existing startup dialog correctly shows the restart variant (not the three-button dialog) when the app re-launches after a completed download.

**Independent Test**: Mock a `ready-to-restart` event. Verify startup dialog shows "Restart now" / "Later" (two buttons only — no "Skip this version"). Dismiss with "Later". Simulate relaunch (call `checkForUpdates()` with mock returning `status: 'ready'`) → verify restart-ready dialog appears again, not the three-button dialog.

### Implementation for User Story 3

- [x] T019 [US3] In `checkForUpdates()` in `core/composables/useElectronUpdater.ts`, ensure the `status: 'ready'` branch does NOT read or check the skipped-version record — it always opens `startupPromptOpen` (restart-ready variant) when `promptIfAvailable` is true
- [x] T020 [US3] Verify `ElectronUpdateStartupDialog.vue` restart-ready variant renders only two buttons ("Later" + "Restart now") — confirm `isRestartPrompt` guards the three-button footer correctly and no "Skip this version" button leaks into the restart variant
- [x] T021 [US3] Remove the `toast.success(...)` call from `api.onReady()` in `initializeUpdaterListeners()` in `core/composables/useElectronUpdater.ts` — restart-ready state is now fully handled by the status bar indicator and startup dialog; removing the toast eliminates redundant UI (design scope cleanup, reduces UX noise)

**Checkpoint**: US3 complete — restart-ready path is clean, no toast duplication, startup dialog correctly shows per-variant footers.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup, edge case hardening, and accessibility verification across all three user stories.

- [x] T022 [P] In `core/composables/useElectronUpdater.ts`, clear the stall timer in `cancelDownload()`, `retryDownload()`, `setReadyUpdate()`, and `onError()` handler to prevent timer leaks when download resolves naturally
- [x] T023 [P] In `ElectronUpdateStartupDialog.vue`, ensure `startupPromptOpen` is set to `false` at the start of `installUpdate()` in the composable so the dialog closes immediately when download begins (FR-005 enforcement)
- [x] T024 Verify `ElectronUpdateIndicator.vue` `hasIndicator` computed returns `true` during `status === 'downloading'` and remains `true` after `cancelDownload()` resets status to `'available'` (since `availableUpdate` still has a value) so the button stays visible for re-download
- [x] T025 [P] In `ElectronUpdateIndicator.vue`, confirm keyboard accessibility: Cancel and Retry buttons in the popover are reachable via Tab with visible focus rings (shadcn `<Button>` handles this by default)
- [x] T026 Smoke test full update lifecycle against `specs/014-enhance-electron-updater/quickstart.md` checklist. **SC-001**: three options visible within 5s. **SC-002**: progress indicator appears within 1s of Download click, no blocking modal. **SC-003**: skipped version never re-prompts; different version string re-prompts. **SC-004**: full app is interactive during download. **SC-005**: download errors surface within 3s in status bar.

---

## Phase 7: User Story 4 — Silent Suppression of GitHub Build-Pending Errors (Priority: P1)

**Goal**: When the user checks for updates and GitHub has published a release tag but the CI build artifacts (the `latest-*.yml` metadata file) are not yet uploaded, `electron-updater` throws a 404 / "not found" error. This must be silently treated as "no update available" — zero error UI is surfaced.

**Root cause**: `electron-updater` resolves the latest release via the GitHub Releases API, then tries to download the platform-specific YAML metadata file (e.g., `latest-mac.yml`) from that release's assets. If the CI pipeline hasn't finished uploading assets yet, the file returns HTTP 404. `electron-updater` emits this as an `error` event. Two listeners in `electron/updater/index.ts` both fire and must both be suppressed.

**Error signature**: `err.message` contains a `.yml` filename AND one of: `404`, `not found`, `Cannot find`.

**Covered IPC paths**:

1. `autoUpdater.once('error', onError)` inside `checkForUpdates()` — rejects the check promise, propagating to renderer `api.check()` catch → `status = 'error'`
2. `autoUpdater.on('error', ...)` permanent listener — calls `forwardUpdaterError()` → sends `updater:error` IPC event to renderer → `toast.error`

**Independent Test**: Mock `autoUpdater.emit('error', new Error('Cannot find latest-mac.yml GitHub release asset'))`. Verify: (1) `checkForUpdates()` resolves `{ status: 'up-to-date' }` instead of throwing; (2) `forwardUpdaterError` is NOT called; (3) no `updater:error` IPC event is sent to renderer.

### Implementation for User Story 4

- [x] T030 Add `function isPendingBuildError(err: Error): boolean` helper in `electron/updater/index.ts`, placed adjacent to `serializeError`. Logic: `return err.message.includes('.yml') && (/404|not found|cannot find/i.test(err.message))`. This detects errors where `electron-updater` cannot fetch the platform metadata YAML file because the GitHub CI build has not yet published its release assets.
- [x] T031 [US4] In `checkForUpdates()` in `electron/updater/index.ts`, update the `const onError = (error: Error) => { ... }` handler: if `isPendingBuildError(error)`, call `cleanup()`, log at `'warn'` level with message `'checkForUpdates() suppressed pending-build error (yml not found)'`, then call `resolve({ status: 'up-to-date', currentVersion: app.getVersion() })` instead of `reject(error)`. Otherwise keep the existing `reject(error)` path.
- [x] T032 [US4] In the permanent `autoUpdater.on('error', ...)` handler in `electron/updater/index.ts` (line ~245): if `isPendingBuildError(err)`, call `logUpdater('warn', 'Suppressed pending-build updater error (yml not found)', serializeError(err))` and return early — do NOT call `forwardUpdaterError(err.message)`. Otherwise keep the existing `forwardUpdaterError` call.
- [x] T033 [P] [US4] Add FR-012 to `specs/014-enhance-electron-updater/spec.md` Functional Requirements section: "**FR-012**: If `checkForUpdates()` fails because the GitHub release metadata file (`latest-*.yml`) cannot be fetched (HTTP 404 / file not found), the system MUST silently treat the result as up-to-date — no error state, no toast, no UI change." Also add the edge case: "What happens when GitHub has a new version tag but the CI build has not finished uploading release assets (`latest-*.yml`)? → `electron-updater` emits a 404 error when fetching the metadata file. The Electron main process detects this pattern and resolves the check as up-to-date. Zero error UI is surfaced to the user."

**Checkpoint**: Error is fully suppressed at the main process level. Zero renderer changes needed. `checkForUpdates()` returns `up-to-date`, permanent error handler does not forward. Verified by inspecting IPC traffic: no `updater:error` event emitted for this error class.

---

---

## Phase 8: Bug Fixes — Progress in Dialog & Restart Action (Revision 2026-04-12)

**Context**: Two behavioral issues found after initial implementation:

1. **BUG-1 — Progress in startup dialog**: When the user clicks "Download update" in `ElectronUpdateStartupDialog`, the dialog closes immediately (T023 behavior), pushing users to the status bar to see progress. Users want to see download progress **within the dialog itself** — the dialog should stay open, show a live progress bar, and auto-transition to the restart-ready state when the download completes.

2. **BUG-2 — Restart from status bar indicator**: The `ElectronUpdateIndicator` trigger button shows tooltip "ready — click to restart" in `ready-to-restart` state, but clicking opens a Popover instead of triggering restart. The "Restart & install" button inside the Popover is the actual action point — two clicks instead of the implied one. Users report the indicator "does nothing" when clicked.

**⚠️ T023 is reverted by T034.** FR-005 ("no blocking dialog while downloading") no longer applies to the startup dialog — the startup dialog is now the **designated progress surface** for downloads initiated from it. The status bar indicator remains the non-blocking surface for all other download triggers.

### Bug 1: Progress within ElectronUpdateStartupDialog

- [x] T034 In `core/composables/useElectronUpdater.ts` inside `installUpdate()`, remove the line `startupPromptOpen.value = false` — the startup dialog must remain open after the user clicks "Download update" so it can display in-dialog progress. **Reverts T023.**
- [x] T035 In `core/composables/useElectronUpdater.ts` inside the `api.onReady()` listener in `initializeUpdaterListeners()`, remove the line `startupPromptOpen.value = false` — when download completes while the dialog is open, the dialog must stay open and auto-transition to the restart-ready variant (driven by `readyToRestartUpdate` becoming truthy via `setReadyUpdate()`); when the dialog was already closed (user clicked "Later"), `startupPromptOpen.value` is already `false` so this removal is a no-op for that path.
- [x] T036 [P] In `components/modules/app-shell/status-bar/components/ElectronUpdateStartupDialog.vue`, add `downloadProgress`, `status`, and `cancelDownload` to the `useElectronUpdater()` destructure at the top of `<script setup>`.
- [x] T037 In `components/modules/app-shell/status-bar/components/ElectronUpdateStartupDialog.vue`, add a progress section **inside `<AlertDialogDescription>`** visible only when `status === 'downloading'` and `!isRestartPrompt`: render a `<Progress :value="downloadProgress" class="h-1.5 w-full mt-2" />` bar followed by a `<p class="text-xs text-muted-foreground">{{ downloadProgress }}%</p>` label. Wrap both in `<div v-if="status === 'downloading' && !isRestartPrompt" class="flex flex-col gap-1.5">`.
- [x] T038 In `components/modules/app-shell/status-bar/components/ElectronUpdateStartupDialog.vue`, update the `<AlertDialogFooter>` for the `!isRestartPrompt` branch when `status === 'downloading'`: (1) replace the "Skip this version" `<AlertDialogCancel>` with a "Cancel" cancel-button calling `cancelDownload()` and using `as="button"` (no dismiss — dialog stays open and reverts to available state so user can re-choose); (2) change the primary `<AlertDialogAction>` label to `'Downloading…'` when `status === 'downloading'` (it is already disabled via `isBusy`). Use a conditional in the button text: `{{ status === 'downloading' ? 'Downloading…' : (isRestartPrompt ? 'Restart now' : 'Download update') }}`.

**Checkpoint Bug 1**: Clicking "Download update" in the startup dialog keeps the dialog open → progress bar and percentage appear and update live → when download completes the dialog auto-switches to "ready to install" restart-ready variant → clicking "Restart now" applies the update. "Later" closes the dialog at any point; "Cancel" resets to available state within the dialog.

### Bug 2: Direct restart action from ElectronUpdateIndicator

- [x] T039 In `components/modules/app-shell/status-bar/components/ElectronUpdateIndicator.vue`, refactor the root template: wrap both the Popover and the direct-action button in a `<template v-if="hasIndicator">`, then render a `<Tooltip>` + direct `<button @click="restartToApplyUpdate()" :disabled="isBusy">` (no Popover) when `readyToRestartUpdate` is set (`v-if="readyToRestartUpdate"`), and keep the existing `<Popover>` structure in a `v-else` for all other states. The direct-action button reuses the same classes (`indicatorClass`), icon (`indicatorIcon`), and label ("Restart to update") as before. The `popoverOpen` ref and `<PopoverContent>` are untouched — they remain for the non-restart states.

**Checkpoint Bug 2**: Clicking the green "Restart to update" status bar button while in `ready-to-restart` state directly calls `restartToApplyUpdate()` — the app restarts immediately without requiring a secondary click inside a Popover.

---

## Dependencies

```
US1 unlocked by: T004, T009 (composable foundational work)
US2 unlocked by: T004, T005, T007, T008, T009 (stall + cancel + retry in composable)
US3 unlocked by: US1 (requires correct dialog guard), T009
US4 unlocked by: none — independent of all other user stories (main process only, no shared state)

Corrections: T027 must complete before T028 and T029 (import must be added before calls are changed)
T028 + T029 are independent of each other after T027.

US4: T030 must complete before T031 and T032 (helper must exist before it can be called)
T031 + T032 are independent of each other after T030.
T033 is documentation-only and fully parallel.

Bug fixes (Phase 8):
  BUG-1: T034 + T035 must complete before T037 + T038 (composable must not close dialog before UI is updated)
  T036 is parallel to T034 + T035 (different file: the component)
  T037 must complete before T038 (progress UI must exist before footer is updated)
  BUG-2: T039 is fully independent (single file, no composable changes)

Parallel opportunities per story:
  Corrections: T028 + T029 parallel after T027
  US1: T010+T011 sequential, T012 single-file atomic edit
  US2: T013, T017, T018 can run in single component edit pass
  Polish: T022, T023, T025 are all in different files — run in parallel
  US4: T031 + T032 + T033 parallel after T030
  Phase 8: T036 + T039 parallel; T034 + T035 parallel; T037 after T034+T035; T038 after T037
```

## Implementation Strategy

**MVP (deliver US1 first):** Complete Phase 2 (foundational), then Phase 3 (US1 three-button dialog + skip logic). This alone delivers the primary user value with no UI regressions — the download still works exactly as before.

**Increment 2:** Add Phase 4 (US2 progress bar + stall detection). Composable is already ready from Phase 2.

**Increment 3:** Phase 5 (US3 restart cleanup) + Phase 6 (polish). These are mostly verification and minor fixes.

**Increment 4 (this revision):** Phase 7 (US4 pending-build error suppression). Main process only, zero renderer changes.

**Increment 5 (this revision):** Phase 8 (Bug fixes — progress in dialog + direct restart action). Two targeted fixes; no new dependencies.

**Total task count**: 39
**Correction tasks**: 3 (T027–T029 — all in `core/composables/useElectronUpdater.ts`)
**US1 tasks**: 3 (T010–T012)
**US2 tasks**: 6 (T013–T018)
**US3 tasks**: 3 (T019–T021)
**US4 tasks**: 4 (T030–T033 — all in `electron/updater/index.ts` + spec.md)
**Foundational tasks**: 9 (T001–T009)
**Polish tasks**: 5 (T022–T026)
**Bug fix tasks**: 6 (T034–T039 — composable + two components)
**Parallel opportunities**: T002+T003 (setup), T028+T029 (corrections), T013 (US2 import), T022+T023+T025 (polish), T031+T032+T033 (US4), T036+T039 (Phase 8 parallel)

## Format Validation

All tasks follow the required checklist format:

- ✅ All start with `- [ ]` or `- [x]`
- ✅ All have sequential Task IDs (T001–T039)
- ✅ `[P]` marker present only on parallelizable tasks
- ✅ `[USx]` label present on all user story phase tasks
- ✅ All include exact file paths
