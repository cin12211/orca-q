export interface FileNode {
  id: string;
  parentId: string | null;
  name: string;
  type: 'file' | 'folder';
  depth: number;
  children?: string[]; // IDs of children
}

export interface DragData {
  nodeId: string;
  node: FileNode;
  selectedNodeIds?: string[]; // For multi-select drag
}

export type DropPosition = 'before' | 'after' | 'inside';

export interface DropIndicator {
  nodeId: string;
  position: DropPosition;
}
