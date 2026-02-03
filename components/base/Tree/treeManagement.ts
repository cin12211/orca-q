import type { FlattenedItem } from 'reka-ui';
import type { TabViewType } from '~/shared/stores';

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
  name?: string;
  parameters?: string;
}

export interface TreeFileSystemItem extends TreeFileSystemItemPersistent {
  path: string; // computed
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
  /** The mutable tree data (roots). */
  public tree: TreeFileSystemItem[];

  private opts: TreeManagerOptions;

  constructor(
    flatData: TreeFileSystemItemPersistent[],
    options: TreeManagerOptions = {}
  ) {
    this.opts = options;
    this.tree = this.buildTree(flatData);
  }

  /** A convenient snapshot of persistable items (no children, no path). */
  get flat(): TreeFileSystemItemPersistent[] {
    return this.flatten(this.tree);
  }

  // ───────────────────── Core builders / utils ─────────────────────

  private rebuildPathsFrom(node: TreeFileSystemItem, parentPath = ''): void {
    node.path = parentPath ? `${parentPath}/${node.title}` : node.title;
    node.children?.forEach(c => this.rebuildPathsFrom(c, node.path));
  }

  private buildTree(
    items: TreeFileSystemItemPersistent[]
  ): TreeFileSystemItem[] {
    const map = new Map<string, TreeFileSystemItem>();
    const roots: TreeFileSystemItem[] = [];

    // materialize
    // 1️⃣ Chuyển flat sang map (chưa có children)
    for (const item of items) {
      map.set(item.id, { ...(item as TreeFileSystemItem), path: '' });
    }

    // link (unknown parent -> root)
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
    // compute paths
    for (const r of roots) this.rebuildPathsFrom(r);

    // optional: keep input order for roots
    const order = new Map(items.map((it, i) => [it.id, i]));
    roots.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
    return roots;
  }

  private flatten(items: TreeFileSystemItem[]): TreeFileSystemItemPersistent[] {
    const out: TreeFileSystemItemPersistent[] = [];
    const pushNode = (n: TreeFileSystemItem) => {
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
      } = n;
      out.push({
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
      });
      n.children?.forEach(pushNode);
    };
    items.forEach(pushNode);
    return out;
  }

  /** DFS deep find by id. */
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
    const pid = target?.parentId;
    return pid ? this.findNode(pid) : null;
  }

  private removeFromCurrentParent(id: string): boolean {
    const remove = (arr: TreeFileSystemItem[]): boolean => {
      const i = arr.findIndex(n => n.id === id);
      if (i >= 0) {
        arr.splice(i, 1);
        return true;
      }
      for (const n of arr) {
        if (n.children && remove(n.children)) return true;
      }
      return false;
    };
    return remove(this.tree);
  }

  // ───────────────────── Mutations ─────────────────────

  /** Insert a node under a parent (or as root when parentId = null). Recomputes path for the node subtree. */
  public insertNode(
    parentId: string | null,
    node: TreeFileSystemItem
  ): TreeFileSystemItem {
    const parent = parentId ? this.findNode(parentId) : null;
    const bucket = parent
      ? (parent.children ?? (parent.children = []))
      : this.tree;

    node.parentId = parentId ?? undefined;
    // node.children = node.children ?? [];
    const parentPath = parent?.path ?? '';
    this.rebuildPathsFrom(node, parentPath);

    bucket.push(node);
    this.opts.onInsert?.([node]);

    return node;
  }

  /** Move node to a (new) parent and optional index; recompute paths. */
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

  /**
   * Update node partially. If `parentId` changes, performs a move.
   * If `title` changes, updates `path` for the subtree.
   */
  public updateNode(
    id: string,
    patch: Partial<TreeFileSystemItem>,
    emitUpdate = true
  ): void {
    const node = this.findNode(id);
    if (!node) return;

    const prevParent = node.parentId;
    const prevTitle = node.title;

    Object.assign(node, patch);

    // parent change => move
    if (patch.parentId !== undefined && patch.parentId !== prevParent) {
      this.moveNode(id, patch.parentId ?? null);
      return; // moveNode already emitted onUpdate
    }

    // title changed => recompute subtree paths
    if (patch.title !== undefined && patch.title !== prevTitle) {
      const parentPath = node.parentId ? (this.getParent(id)?.path ?? '') : '';
      this.rebuildPathsFrom(node, parentPath);
    }

    if (emitUpdate) {
      this.opts.onUpdate?.([node]);
    }
  }

  /** Delete a node and all descendants; triggers onDelete with the deleted set. */
  public deleteNode(id: string): void {
    const deleted: TreeFileSystemItem[] = [];

    const collect = (n: TreeFileSystemItem) => {
      deleted.push(n);
      n.children?.forEach(collect);
    };

    const removeRec = (arr: TreeFileSystemItem[]): boolean => {
      const i = arr.findIndex(n => n.id === id);
      if (i >= 0) {
        collect(arr[i]);
        arr.splice(i, 1);
        return true;
      }
      for (const n of arr) {
        if (n.children && removeRec(n.children)) return true;
      }
      return false;
    };

    removeRec(this.tree);
    if (deleted.length) this.opts.onDelete?.(deleted);
  }

  /**
   * Sort nodes by title (case-insensitive) recursively.
   * If `ascending = false`, sorts descending.
   */
  public sortByTitle(ascending = true): void {
    const sortRecursive = (nodes: TreeFileSystemItem[]): void => {
      nodes.sort((a, b) => {
        const cmp = a.title.localeCompare(b.title, undefined, {
          sensitivity: 'base',
        });
        return ascending ? cmp : -cmp;
      });
      for (const n of nodes) {
        if (n.children && n.children.length > 0) sortRecursive(n.children);
      }
    };
    sortRecursive(this.tree);
  }

  /**
   * Lọc cây theo tiêu đề. Trả về một cây MỚI (deep copy) chỉ chứa
   * các node khớp tiêu chí hoặc có hậu duệ khớp. Duyệt tối đa levelSearch.
   * - titleSearch: so khớp substring, không phân biệt hoa/thường.
   * - levelSearch: độ sâu tối đa tính từ root (root = 0). Mặc định: không giới hạn.
   */
  public searchByTitle(
    titleSearch: string,
    levelSearch?: number
  ): TreeFileSystemItem[] {
    const q = (titleSearch ?? '').trim().toLocaleLowerCase();
    const maxDepth =
      typeof levelSearch === 'number' && levelSearch >= 0
        ? levelSearch
        : Number.POSITIVE_INFINITY;

    const filter = (
      nodes: TreeFileSystemItem[],
      depth: number
    ): TreeFileSystemItem[] => {
      const out: TreeFileSystemItem[] = [];
      for (const n of nodes) {
        if (depth > maxDepth) continue;

        // Duyệt con nếu còn quota độ sâu
        const filteredChildren =
          n.children && depth < maxDepth ? filter(n.children, depth + 1) : [];

        const selfMatch =
          q === '' ? true : n.title.toLocaleLowerCase().includes(q);

        if (selfMatch || filteredChildren.length > 0) {
          // Clone node, children chỉ set khi có
          const clone: TreeFileSystemItem = {
            ...n,
            children: filteredChildren.length ? filteredChildren : undefined,
            path: '', // sẽ build lại
          };
          out.push(clone);
        }
      }
      return out;
    };

    const resultRoots = filter(this.tree, 0);

    // Tính lại path cho cây kết quả (độc lập dữ liệu gốc)
    for (const r of resultRoots) this.rebuildPathsFrom(r);

    return resultRoots;
  }

  public isExitNodeNameInPath(
    name: string,
    nodeId: string,
    parentId: string
  ): boolean {
    if (!name) return false;

    const parentNode = this.findNode(parentId);

    const nodes = (parentNode ? parentNode.children : this.tree) ?? [];

    const isExitNode = nodes.find(n => n.title === name && n.id !== nodeId);
    if (!!isExitNode) {
      return true;
    }

    return false;
  }
}
