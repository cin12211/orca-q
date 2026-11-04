export type RowQueryFileStatus = 'edit' | 'onlyView';

// RowQueryFile shares shape with TreeFileSystemItem (file-tree component)
export interface RowQueryFile {
  id: string;
  workspaceId: string;
  title: string;
  type: 'file' | 'folder';
  icon: string;
  connectionId?: string;
  parentId?: string;
  isFolder?: boolean;
  closeIcon?: string;
  variables?: string;
  createdAt: string;
  path?: string;
  updatedAt?: string;
  status?: RowQueryFileStatus;
  cursorPos?: { from: number; to: number };
}

export interface RowQueryFileContent {
  id: string; // matches RowQueryFile.id
  contents: string;
}
