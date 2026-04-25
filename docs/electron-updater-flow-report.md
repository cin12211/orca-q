# Electron Updater Flow Report

## Scope

Reviewed the desktop updater flow across Electron main process, preload IPC, renderer composable state, startup behavior, and the status/settings UI.

## Findings

### Bug 0: macOS downloaded update failed validation during install

- Error observed: `Code signature ... did not pass validation: code failed to satisfy specified code requirement(s)`.
- Root cause: the macOS release pipeline was publishing update artifacts without passing `CSC_LINK` and `CSC_KEY_PASSWORD` into the `electron-builder` step.
- Impact: the update could download successfully, but ShipIt would reject the downloaded `.app` bundle during install.

### Bug 1: Checking updates could report the same installed version as a new update

- Root cause: the renderer treated any successful `updater:check` response as an available update.
- Why it happened: `electron-updater` still provides `updateInfo` metadata as part of the check lifecycle, so `result.updateInfo` alone is not a reliable signal that a newer version exists.
- Impact: users on `1.0.40` could still see `1.0.40` presented as an update.

### Bug 2: Clicking update could fail to download

- Root cause: the UI could enter the `available` state without a real update, then call `downloadUpdate()` against a non-downloadable target.
- Secondary issue: updater state was local to each composable call, so status bar, settings, and startup flows did not share one consistent state source.
- Impact: update CTA could be enabled in the wrong state and appear broken.

### Bug 3: App startup did not show a confirm-update popup

- Root cause: startup update checking existed in the composable but was never invoked from the app entry.
- Additional race: the previous startup helper registered the `onUpdateAvailable` listener only after awaiting `check()`, so the event could already be missed.
- Impact: users would not see a confirmation dialog when opening the desktop app, even when an update existed.

## Fixes Applied

- Updated the GitHub Actions release workflow so macOS builds receive signing secrets and fail fast if they are missing.
- Reworked the Electron main-process updater check to resolve availability from `update-available` and `update-not-available` events.
- Normalized updater payloads to always include the actual current app version.
- Converted renderer updater state into a singleton composable state shared by all updater surfaces.
- Registered updater listeners once, up front, to avoid missing lifecycle events.
- Added a startup update confirmation dialog rendered from the app root.
- Triggered startup update checks from `app.vue` through a delayed scheduler and added a one-time focus retry.
- Removed the fire-and-forget startup check from the Electron main process to avoid duplicate/racing checks outside renderer control.

## Files Changed

- `electron/updater/index.ts`
- `electron/main.ts`
- `core/composables/useElectronUpdater.ts`
- `app.vue`
- `components/modules/app-shell/status-bar/components/ElectronUpdateStartupDialog.vue`
- `.github/workflows/electron-release.yml`

## Verification

- Manual logic verification for:
  - same-version check result -> `up-to-date`
  - real update result -> `available`
  - downloaded update -> `ready-to-restart`
  - startup flow -> confirmation dialog appears from renderer-controlled check
- Added regression tests for the shared updater composable flow.

## Residual Risk

- Real download/install still depends on release artifacts and publish metadata being present in GitHub Releases.
- End-to-end validation requires running a packaged Electron build signed with a valid Apple Developer certificate against an actual release feed.
