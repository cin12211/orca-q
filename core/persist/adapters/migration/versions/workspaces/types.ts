/**
 * Historic shapes for the `workspaces` collection.
 *
 * ─────────────────────────────────────────────────────
 * CONVENTION
 * ─────────────────────────────────────────────────────
 * When you create migration vN, add the shape for vN-1
 * here as `WorkspaceV{N-1}` so the step function is
 * fully type-safe without importing from the store.
 *
 * Never change or delete an existing interface — they
 * document historical on-disk layouts.
 * ─────────────────────────────────────────────────────
 *
 * v1 — initial shape (shipped with first public release)
 */
export interface WorkspaceV1 {
  id: string;
  icon: string;
  name: string;
  desc?: string;
  lastOpened?: string;
  createdAt: string;
  updatedAt?: string;
}
