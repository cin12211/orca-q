import type { FlattenedItem } from 'reka-ui';
import type { TabViewType } from '~/core/stores';

export enum ETreeFileSystemStatus {
  edit = 'edit',
  onlyView = 'onlyView',
}

export interface TreeFileSystemItemPersistent {
  id: string;
  title: string;
  icon: string;
  iconClass?: string;
  closeIcon?: string;
  status?: ETreeFileSystemStatus;
  tabViewType?: TabViewType;
  workspaceId?: string;
  connectionId?: string;
  createdAt?: string;
  updateAt?: string;
  parentId?: string;
  isFolder: boolean;
  cursorPos?: { from: number; to: number };
  variables?: string;
  name?: string;
  parameters?: string;
}

export interface TreeFileSystemItem extends TreeFileSystemItemPersistent {
  path: string;
  children?: TreeFileSystemItem[];
}

export type TreeFileSystem = TreeFileSystemItem[];

export type FlattenedTreeFileSystemItem = FlattenedItem<TreeFileSystemItem>;

export interface TreeManagerOptions {
  onInsert?: (nodes: TreeFileSystemItem[]) => void;
  onUpdate?: (nodes: TreeFileSystemItem[]) => void;
  onDelete?: (nodes: TreeFileSystemItem[]) => void;
}

export class TreeManager {
  public tree: TreeFileSystemItem[];

  private opts: TreeManagerOptions;

  constructor(
    flatData: TreeFileSystemItemPersistent[],
    options: TreeManagerOptions = {}
  ) {
    this.opts = options;
    this.tree = this.buildTree(flatData);
  }

  get flat(): TreeFileSystemItemPersistent[] {
    return this.flatten(this.tree);
  }

  private rebuildPathsFrom(node: TreeFileSystemItem, parentPath = ''): void {
    node.path = parentPath ? `${parentPath}/${node.title}` : node.title;
    node.children?.forEach(child => this.rebuildPathsFrom(child, node.path));
  }

  private buildTree(
    items: TreeFileSystemItemPersistent[]
  ): TreeFileSystemItem[] {
    const map = new Map<string, TreeFileSystemItem>();
    const roots: TreeFileSystemItem[] = [];

    for (const item of items) {
      map.set(item.id, { ...(item as TreeFileSystemItem), path: '' });
    }

    for (const node of map.values()) {
      if (node.parentId) {
        const parent = map.get(node.parentId);
        if (parent) {
          if (!parent.children) parent.children = [];
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    }

    for (const root of roots) {
      this.rebuildPathsFrom(root);
    }

    const order = new Map(items.map((item, index) => [item.id, index]));
    roots.sort((left, right) => order.get(left.id)! - order.get(right.id)!);

    return roots;
  }

  private flatten(items: TreeFileSystemItem[]): TreeFileSystemItemPersistent[] {
    const out: TreeFileSystemItemPersistent[] = [];
    const pushNode = (node: TreeFileSystemItem) => {
      const {
        id,
        title,
        icon,
        closeIcon,
        status,
        workspaceId,
        connectionId,
        createdAt,
        updateAt,
        parentId,
        isFolder,
        cursorPos,
        variables,
        iconClass,
        tabViewType,
        name,
        parameters,
      } = node;

      out.push({
        id,
        title,
        icon,
        iconClass,
        closeIcon,
        status,
        tabViewType,
        workspaceId,
        connectionId,
        createdAt,
        updateAt,
        parentId,
        isFolder,
        cursorPos,
        variables,
        name,
        parameters,
      });

      node.children?.forEach(pushNode);
    };

    items.forEach(pushNode);
    return out;
  }

  public findNode(
    id: string,
    nodes: TreeFileSystemItem[] = this.tree
  ): TreeFileSystemItem | null {
    for (const node of nodes) {
      if (node.id === id) return node;

      if (node.children) {
        const hit = this.findNode(id, node.children);
        if (hit) return hit;
      }
    }

    return null;
  }

  private getParent(nodeId: string): TreeFileSystemItem | null {
    const target = this.findNode(nodeId);
    const parentId = target?.parentId;
    return parentId ? this.findNode(parentId) : null;
  }

  private removeFromCurrentParent(id: string): boolean {
    const remove = (nodes: TreeFileSystemItem[]): boolean => {
      const index = nodes.findIndex(node => node.id === id);
      if (index >= 0) {
        nodes.splice(index, 1);
        return true;
      }

      for (const node of nodes) {
        if (node.children && remove(node.children)) {
          return true;
        }
      }

      return false;
    };

    return remove(this.tree);
  }

  public insertNode(
    parentId: string | null,
    node: TreeFileSystemItem
  ): TreeFileSystemItem {
    const parent = parentId ? this.findNode(parentId) : null;
    const bucket = parent
      ? (parent.children ?? (parent.children = []))
      : this.tree;

    node.parentId = parentId ?? undefined;
    this.rebuildPathsFrom(node, parent?.path ?? '');

    bucket.push(node);
    this.opts.onInsert?.([node]);

    return node;
  }

  public moveNode(
    id: string,
    newParentId: string | null,
    newIndex?: number
  ): void {
    const node = this.findNode(id);
    if (!node) return;

    this.removeFromCurrentParent(id);

    const parent = newParentId ? this.findNode(newParentId) : null;
    const bucket = parent
      ? (parent.children ?? (parent.children = []))
      : this.tree;

    node.parentId = newParentId ?? undefined;

    if (
      typeof newIndex === 'number' &&
      newIndex >= 0 &&
      newIndex <= bucket.length
    ) {
      bucket.splice(newIndex, 0, node);
    } else {
      bucket.push(node);
    }

    this.rebuildPathsFrom(node, parent?.path ?? '');
    this.opts.onUpdate?.([node]);
  }

  public updateNode(
    id: string,
    patch: Partial<TreeFileSystemItem>,
    emitUpdate = true
  ): void {
    const node = this.findNode(id);
    if (!node) return;

    const previousParentId = node.parentId;
    const previousTitle = node.title;

    Object.assign(node, patch);

    if (patch.parentId !== undefined && patch.parentId !== previousParentId) {
      this.moveNode(id, patch.parentId ?? null);
      return;
    }

    if (patch.title !== undefined && patch.title !== previousTitle) {
      const parentPath = node.parentId ? (this.getParent(id)?.path ?? '') : '';
      this.rebuildPathsFrom(node, parentPath);
    }

    if (emitUpdate) {
      this.opts.onUpdate?.([node]);
    }
  }

  public deleteNode(id: string): void {
    const deleted: TreeFileSystemItem[] = [];

    const collect = (node: TreeFileSystemItem) => {
      deleted.push(node);
      node.children?.forEach(collect);
    };

    const removeRec = (nodes: TreeFileSystemItem[]): boolean => {
      const index = nodes.findIndex(node => node.id === id);
      if (index >= 0) {
        collect(nodes[index]);
        nodes.splice(index, 1);
        return true;
      }

      for (const node of nodes) {
        if (node.children && removeRec(node.children)) {
          return true;
        }
      }

      return false;
    };

    removeRec(this.tree);
    if (deleted.length) {
      this.opts.onDelete?.(deleted);
    }
  }

  public sortByTitle(ascending = true): void {
    const sortRecursive = (nodes: TreeFileSystemItem[]): void => {
      nodes.sort((left, right) => {
        const compareResult = left.title.localeCompare(right.title, undefined, {
          sensitivity: 'base',
        });

        return ascending ? compareResult : -compareResult;
      });

      for (const node of nodes) {
        if (node.children?.length) {
          sortRecursive(node.children);
        }
      }
    };

    sortRecursive(this.tree);
  }

  public searchByTitle(
    titleSearch: string,
    levelSearch?: number
  ): TreeFileSystemItem[] {
    const query = (titleSearch ?? '').trim().toLocaleLowerCase();
    const maxDepth =
      typeof levelSearch === 'number' && levelSearch >= 0
        ? levelSearch
        : Number.POSITIVE_INFINITY;

    const filter = (
      nodes: TreeFileSystemItem[],
      depth: number
    ): TreeFileSystemItem[] => {
      const out: TreeFileSystemItem[] = [];

      for (const node of nodes) {
        if (depth > maxDepth) continue;

        const filteredChildren =
          node.children && depth < maxDepth
            ? filter(node.children, depth + 1)
            : [];

        const selfMatch =
          query === '' ? true : node.title.toLocaleLowerCase().includes(query);

        if (selfMatch || filteredChildren.length > 0) {
          out.push({
            ...node,
            children: filteredChildren.length ? filteredChildren : undefined,
            path: '',
          });
        }
      }

      return out;
    };

    const resultRoots = filter(this.tree, 0);

    for (const root of resultRoots) {
      this.rebuildPathsFrom(root);
    }

    return resultRoots;
  }

  public isExitNodeNameInFolder(
    name: string,
    nodeId: string,
    parentId: string
  ): boolean {
    if (!name) return false;

    const parentNode = this.findNode(parentId);
    const nodes = (parentNode ? parentNode.children : this.tree) ?? [];

    return !!nodes.find(node => node.title === name && node.id !== nodeId);
  }
}
