/**
 * Historic shapes for the `rowQueryFiles` collection.
 *
 * v0 — legacy shape persisted a connectionId on each raw-query file/folder.
 */
export interface RowQueryFileV0 {
  id: string;
  title: string;
  icon: string;
  iconClass?: string;
  closeIcon?: string;
  status?: string;
  tabViewType?: string;
  workspaceId?: string;
  connectionId?: string;
  createdAt?: string;
  updateAt?: string;
  updatedAt?: string;
  parentId?: string;
  isFolder: boolean;
  cursorPos?: { from: number; to: number };
  name?: string;
  parameters?: string;
}

/**
 * v1 — removes persisted connectionId so raw-query files are connection-agnostic.
 */
export interface RowQueryFileV1 extends Omit<RowQueryFileV0, 'connectionId'> {}

/**
 * v2 — stores variables in file metadata instead of rowQueryFileContents.
 */
export interface RowQueryFileV2 extends RowQueryFileV1 {
  variables: string;
}

/**
 * Transitional runtime shape seen by v2 migration:
 * legacyStoreMigration may already have copied `variables` onto the doc
 * before the versioned migration runner applies rowQueryFiles v002.
 */
export type RowQueryFileV1OrV2 = RowQueryFileV1 | RowQueryFileV2;
