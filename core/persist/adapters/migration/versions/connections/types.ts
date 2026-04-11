/**
 * Historic shapes for the `connections` collection.
 *
 * v1 — initial shape (shipped with first public release)
 */
export interface ConnectionV1 {
  id: string;
  workspaceId: string;
  name: string;
  type: string;
  method: string;
  connectionString?: string;
  host?: string;
  port?: string;
  username?: string;
  password?: string;
  database?: string;
  ssl?: unknown;
  ssh?: unknown;
  createdAt: string;
  updatedAt?: string;
}

/**
 * v2 — adds tagIds array for environment tag support
 */
export interface ConnectionV2 extends ConnectionV1 {
  tagIds: string[];
}
