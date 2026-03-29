/**
 * Central migration list — the single file you edit to register a new step.
 *
 * ─────────────────────────────────────────────────────────────────────
 * HOW TO ADD A MIGRATION
 * ─────────────────────────────────────────────────────────────────────
 * 1. Create a new file:
 *      versions/{collection}/v{NNN}-{short-slug}.ts
 *    e.g. versions/workspaces/v002-rename-desc.ts
 *
 * 2. Define the migration there:
 *      import type { VersionedMigration } from '../../types';
 *      import type { WorkspaceV1 } from './types';
 *
 *      interface WorkspaceV2 extends Omit<WorkspaceV1, 'desc'> {
 *        description?: string;
 *      }
 *
 *      export default {
 *        collection: 'workspaces',
 *        version: 2,
 *        description: 'Rename desc → description for API consistency',
 *        up(doc: WorkspaceV1): WorkspaceV2 {
 *          const { desc, ...rest } = doc;
 *          return { ...rest, description: desc };
 *        },
 *      } satisfies VersionedMigration<WorkspaceV1, WorkspaceV2>;
 *
 * 3. Import it below and add it to ALL_MIGRATIONS.
 *    The runner sorts and groups automatically — order here does NOT matter.
 * ─────────────────────────────────────────────────────────────────────
 */
import type { VersionedMigration } from '../types';

// ── Import migration steps here ──────────────────────────────────────
// (uncomment each step when the corresponding schema change ships)
//
// import workspaceV2 from './workspaces/v002-rename-desc';
// import connectionV2 from './connections/v002-add-color';

// ── Master list ──────────────────────────────────────────────────────
// The runner auto-groups by collection and sorts by version.

export const ALL_MIGRATIONS: VersionedMigration[] = [
  // workspaceV2,
  // connectionV2,
];
