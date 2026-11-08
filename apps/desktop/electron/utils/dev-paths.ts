import { app } from 'electron';
import path from 'node:path';

/**
 * Repo root in development (`electron:dev`).
 *
 * The app path is apps/desktop (the folder holding the package.json whose
 * `main` Electron loaded), so the monorepo root is two levels up. This keeps
 * dev-only files (.sqlite3/, .electron-logs/) at the repo root whatever the
 * current working directory is. Never use it for packaged builds.
 */
export function getDevRepoRoot(): string {
  return path.resolve(app.getAppPath(), '..', '..');
}
