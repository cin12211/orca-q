/**
 * Historic shapes for the `rowQueryFileContents` collection.
 *
 * v0 — legacy shape stored both file contents and variables.
 */
export interface RowQueryFileContentV0 {
  id: string;
  contents: string;
  variables?: string;
}

/**
 * v1 — stores only file contents.
 */
export interface RowQueryFileContentV1 {
  id: string;
  contents: string;
}
