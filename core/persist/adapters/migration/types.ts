import type { PersistCollection } from '../tauri/primitives';

/**
 * A fully self-contained schema migration step.
 *
 * Each migration lives in its own file (`versions/{collection}/v{NNN}-{slug}.ts`),
 * carries its target collection, version, and a human-readable description so the
 * runner can report progress and owners can trace history without reading code.
 *
 * @example
 * // versions/workspaces/v002-rename-desc.ts
 * export default {
 *   collection: 'workspaces',
 *   version: 2,
 *   description: 'Rename desc → description for API consistency',
 *   up(doc: WorkspaceV1): WorkspaceV2 {
 *     const { desc, ...rest } = doc;
 *     return { ...rest, description: desc };
 *   },
 * } satisfies VersionedMigration<WorkspaceV1, WorkspaceV2>;
 */
export interface VersionedMigration<From = unknown, To = unknown> {
  /** Which persist collection this step belongs to. */
  collection: PersistCollection;
  /** The schema version this step produces (must be sequential, no gaps). */
  version: number;
  /** One-line description shown in console + migration UI. */
  description: string;
  /** Pure function: old document shape → new document shape. No side-effects. */
  up(doc: From): To;
}

/** Progress event emitted by the runner for each applied step. */
export interface MigrationStepInfo {
  collection: string;
  version: number;
  description: string;
}

/**
 * @deprecated Use `VersionedMigration` instead.
 * Kept as an alias for any direct code referencing the old name.
 */
export type MigrationStep<From = unknown, To = unknown> = VersionedMigration<
  From,
  To
>;

/** @deprecated Use `VersionedMigration[]`. The registry object shape is no longer used. */
export type MigrationRegistry = Partial<
  Record<PersistCollection, VersionedMigration<unknown, unknown>[]>
>;
