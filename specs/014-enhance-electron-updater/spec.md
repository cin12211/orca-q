# Feature Specification: Enhanced Electron App Updater

**Feature Branch**: `014-enhance-electron-updater`  
**Created**: 2026-04-12  
**Status**: Draft  
**Input**: User description: "enhance updater for electron app for case download just show progress When have new version allow user 3 option : update later, skip this version, download"

## Clarifications

### Session 2026-04-12

- Q: Where should the download progress indicator appear? → A: Status bar (existing bottom status bar)
- Q: Where should the "skip this version" preference be persisted? → A: Electron store (electron/persist/ layer; survives restarts, not renderer-dependent)
- Q: Should the three-option dialog also apply to manual "Check for updates" triggers (not just startup)? → A: Yes — same dialog for any update-available event regardless of trigger source
- Q: If the user clicks "Later" from the restart-ready prompt and re-opens the app, which prompt appears? → A: Restart-ready prompt again (download is already complete; no need to re-enter the three-option flow)
- Q: Should a stalled/stuck download surface a cancel option? → A: Yes — if progress stops, expose "Cancel" and "Retry" actions in the status bar indicator

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Three-Option Update Prompt (Priority: P1)

When the app detects a new version at startup (or after an explicit check), the user is presented with a dialog offering three clear choices: download the update now, defer until later, or permanently skip this specific version.

**Why this priority**: This is the core value of the feature — replacing the current two-option dialog with a richer decision surface that respects user intent (especially "skip this version", which currently doesn't exist).

**Independent Test**: Can be fully tested by mocking an update-available event and verifying that the dialog renders all three action buttons and that each triggers its correct behavior independently.

**Acceptance Scenarios**:

1. **Given** the app starts and a new version is available, **When** the update notification dialog appears, **Then** it must display exactly three options: "Download", "Later", and "Skip this version".
2. **Given** the update dialog is open, **When** the user clicks "Download", **Then** the dialog closes and the download begins.
3. **Given** the update dialog is open, **When** the user clicks "Later", **Then** the dialog closes and the user is not prompted again until the next app launch.
4. **Given** the update dialog is open, **When** the user clicks "Skip this version", **Then** the dialog closes and the user is never prompted again for this specific version number.
5. **Given** the user previously skipped version X, **When** the app starts and version X is still the latest, **Then** no update notification dialog is shown.
6. **Given** the user previously skipped version X, **When** the app starts and version Y (newer) is the latest, **Then** the update notification dialog is shown again for version Y.

---

### User Story 2 - Download Progress Indicator (Priority: P2)

While the update is downloading in the background, the user sees a clear inline progress indicator — without a blocking dialog — so they can continue using the app normally.

**Why this priority**: Users need feedback that the download is proceeding, but a blocking dialog would interrupt their workflow. A non-intrusive progress bar is the right UX balance.

**Independent Test**: Can be fully tested by triggering a download and verifying that a progress element (percentage + bar) appears and updates in real time without showing any blocking dialog.

**Acceptance Scenarios**:

1. **Given** the user clicked "Download" in the update dialog, **When** the download starts, **Then** a non-blocking progress indicator appears showing the download percentage.
2. **Given** the download is in progress, **When** the progress changes, **Then** the indicator updates to reflect the current percentage.
3. **Given** the download is in progress, **When** no blocking dialog is present, **Then** the user can interact with all other parts of the app normally.
4. **Given** the download completes successfully, **When** the app is ready to restart, **Then** the progress indicator transitions to a "Ready to install" state with a "Restart now" action.
5. **Given** the download fails, **When** the error is detected, **Then** the progress indicator transitions to an error state with a clear message.

---

### User Story 3 - Restart-Ready Notification (Priority: P3)

When the downloaded update is ready to install, the user receives a clear, non-blocking prompt to restart the app and apply the update.

**Why this priority**: Completing the update lifecycle requires a restart step. This is less critical than the other two stories because the existing toast notification partially covers it.

**Independent Test**: Can be fully tested by mocking a "download complete / ready to restart" event and verifying a prompt appears with "Restart now" and "Later" actions.

**Acceptance Scenarios**:

1. **Given** the update download is complete, **When** the app is ready to restart, **Then** a prompt appears informing the user that version X is ready to install.
2. **Given** the restart-ready prompt is shown, **When** the user clicks "Restart now", **Then** the app closes and relaunches into the updated version.
3. **Given** the restart-ready prompt is shown, **When** the user clicks "Later", **Then** the prompt is dismissed and the user can continue until they choose to restart manually.

---

### Edge Cases

- What happens if the user clicks "Download" and then closes the app before the download finishes? → electron-updater cleans up temp files on next launch; the `cachedReadyUpdate` is not persisted, so the app returns to the update-available flow on re-launch.
- What happens if a new version is released while a download is already in progress for an older version? → The `updater:update-available` IPC event is ignored at the renderer level while `status === 'downloading'`; the in-progress download completes normally. The newly available version is detected on the next manual check or app launch.
- What happens when the version number in the skip list matches a version with a different patch suffix (e.g., skipped `1.2.0`, new release is `1.2.0-beta.1`)? → The skip check uses exact string equality. `1.2.0-beta.1` ≠ `1.2.0`, so the dialog appears. Pre-release versions are not suppressed by a skip of the base version.
- What if the app cannot persist the skipped-version preference (e.g., disk write failure)? → The `skipVersion()` call wraps the persist call in a try/catch. On failure, it silently treats the action as "Later" (closes the prompt without persisting). No error is surfaced to the user.
- What happens if the progress percent never reaches 100% (stalled download)? → Cancel and Retry actions are surfaced in the status bar indicator after a stall is detected.
- What happens when GitHub has a new version tag but the CI build has not finished uploading release assets (`latest-*.yml`)? → `electron-updater` emits an error when fetching the metadata file (HTTP 404). The Electron main process (`electron/updater/index.ts`) detects this pattern via `isPendingBuildError()` and: (1) resolves `checkForUpdates()` as `up-to-date` instead of rejecting; (2) suppresses the permanent `on('error')` forwarding so no `updater:error` IPC event reaches the renderer. Zero error UI is surfaced to the user.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: When a new version is detected — whether at startup or via a manual "Check for updates" action — the system MUST display a dialog presenting the user with three choices: "Download", "Later", and "Skip this version".
- **FR-002**: The system MUST persist the skipped version number in the Electron store (via the existing `electron/persist/` layer) so that the prompt is suppressed for that specific version on subsequent app launches.
- **FR-003**: When a new version is available and its version string does not exactly match the persisted skipped version, the system MUST show the update dialog. No cleanup of the persisted skip record is required — the exact-match bypass is the intentional suppression mechanism.
- **FR-004**: While a download is in progress, the system MUST display a non-blocking progress indicator in the status bar showing the current download percentage.
- **FR-005**: While a download is in progress, the system MUST NOT display a blocking dialog — the user MUST be able to interact with the full application.
- **FR-006**: When the download completes, the system MUST display a non-blocking "ready to install" prompt with "Restart now" and "Later" options.
- **FR-007**: When "Restart now" is selected, the system MUST close and relaunch into the updated version.
- **FR-008**: If the download encounters an error, the system MUST display a clear error message in-place of the progress indicator in the status bar.
- **FR-009**: The "Later" action MUST dismiss all update UI without persisting any skip state; the prompt will reappear on the next app launch.
- **FR-010**: If the download stalls (no progress for a defined interval), the status bar indicator MUST surface "Cancel" and "Retry" actions to the user.
- **FR-011**: When the user dismisses the restart-ready prompt with "Later" and relaunches the app, the system MUST show the restart-ready prompt again (not the three-option dialog), since the download is already complete.
- **FR-012**: If `checkForUpdates()` fails because the GitHub release metadata file (`latest-*.yml`) cannot be fetched (HTTP 404 or "not found" / "cannot find" in error message), the system MUST silently treat the result as up-to-date — no error state, no toast, no UI change is surfaced to the user.

### Key Entities

- **SkippedVersion**: A persisted record of the version the user chose to skip. Stores the version string. Cleared or ignored when a newer version becomes available.
- **DownloadProgress**: Transient state representing the current download — percentage complete, bytes transferred, total bytes. Used solely to drive the progress indicator.
- **UpdateState**: The current phase of the update lifecycle — idle, available, downloading, ready-to-restart, error. Drives which UI element is shown.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can choose from all three update options (Download, Later, Skip this version) within 5 seconds of the dialog appearing.
- **SC-002**: After clicking "Download", users see a progress indicator within 1 second reflecting live download progress — with no blocking dialogs present.
- **SC-003**: A skipped version is never surfaced again to the user unless a higher version becomes available, achieving 100% suppression accuracy.
- **SC-004**: Users can perform any app action uninterrupted while a background download is in progress.
- **SC-005**: Download errors surface a descriptive message to the user within 3 seconds of the failure occurring.

## Assumptions

- "Skip this version" applies only to the exact version string (e.g., `"1.2.3"`). Any other version string — including a newer one — will not match and causes the dialog to appear.
- Persisted skip preference survives app restarts and is stored locally on the user's machine.
- The progress indicator is surfaced in the existing status bar as a persistent, non-blocking download segment (percentage + progress bar).
- The three-option dialog replaces the existing two-button startup dialog (`ElectronUpdateStartupDialog`) and applies to any update-available event regardless of trigger (startup or manual check).
- The restart-ready path retains a two-button pattern (Restart now / Later); selecting "Later" will show the restart-ready prompt again on the next app launch.
- The skipped-version preference is persisted in electron-store, accessed from the renderer via the existing contextBridge IPC persist layer (`appConfig` collection). The main process stores it; the renderer reads/writes it via `window.electronAPI.persist`.
