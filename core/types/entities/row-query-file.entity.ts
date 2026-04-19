// RowQueryFile shares shape with TreeFileSystemItem (file-tree component)
export interface RowQueryFile {
  id: string;
  workspaceId: string;
  parentId?: string;
  title: string;
  type: 'file' | 'folder';
  createdAt: string;
  updatedAt?: string;
  connectionId?: string; // stripped before persist (deprecated field)
  [key: string]: unknown;
}

export interface RowQueryFileContent {
  id: string; // matches RowQueryFile.id
  contents: string;
}
