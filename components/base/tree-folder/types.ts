export interface FileNode<T extends object = Record<string, unknown>> {
  id: string;
  parentId: string | null;
  name: string;
  type: 'file' | 'folder';
  depth: number;
  children?: string[]; // IDs of children
  iconOpen?: string;
  iconClose?: string;
  iconClass?: string;
  data?: T;
}

export interface DragData<T extends object = Record<string, unknown>> {
  nodeId: string;
  node: FileNode<T>;
  selectedNodeIds?: string[]; // For multi-select drag
}

export type DropPosition = 'before' | 'after' | 'inside';

export interface DropIndicator {
  nodeId: string;
  position: DropPosition;
}
