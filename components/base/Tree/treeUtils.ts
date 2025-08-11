// import type { Instruction } from "@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item";
import dayjs from 'dayjs';
import type { FlattenedItem } from 'reka-ui';
import { uuidv4 } from '~/lib/utils';

export enum ETreeFileSystemStatus {
  edit = 'edit',
  onlyView = 'onlyView',
}

export interface TreeFileSystemItem {
  id: string;
  title: string;
  icon: string;
  closeIcon?: string;
  children?: TreeFileSystemItem[]; // Recursive, optional array of FileSystemItem
  status?: ETreeFileSystemStatus; // Optional, only present in some items
  paths: string[];
  workspaceId?: string;
  connectionId?: string;
  createdAt?: string;
  updateAt?: string;
  parentId?: string;
  isFolder: boolean;
}

export type TreeFileSystem = TreeFileSystemItem[];

export type FlattenedTreeFileSystemItem = FlattenedItem<TreeFileSystemItem>;

export type TreeAction =
  | {
      //   type: "instruction";
      //   instruction: Instruction;
      itemId: string;
      targetId: string;
    }
  | {
      type: 'toggle';
      itemId: string;
    }
  | {
      type: 'expand';
      itemId: string;
    }
  | {
      type: 'collapse';
      itemId: string;
    }
  | { type: 'modal-move'; itemId: string; targetId: string; index: number };

export const getTreeItemPath = (paths: string[]): string => {
  return paths.join('/');
};

export const tree = {
  removeItemByPaths(
    data: TreeFileSystem,
    targetPaths: string[]
  ): TreeFileSystem {
    return data
      .filter(
        item => getTreeItemPath(item.paths) !== getTreeItemPath(targetPaths)
      )
      .map(item => {
        if (item.children) {
          return {
            ...item,
            children: tree.removeItemByPaths(item.children, targetPaths),
          };
        }
        return item;
      });
  },

  updateByPath({
    paths,
    items,
    newItem,
  }: {
    items: TreeFileSystemItem[];
    paths: string[];
    newItem: (item: TreeFileSystemItem) => TreeFileSystemItem;
  }): TreeFileSystemItem[] {
    const [currentPath, ...remainingPaths] = paths;

    return items.map(item => {
      if (item.title === currentPath) {
        if (remainingPaths.length === 0) {
          return newItem(item);
        }

        if (item.children) {
          return {
            ...item,
            children: tree.updateByPath({
              paths: remainingPaths,
              items: item.children,
              newItem,
            }),
          };
        }
      }

      return item;
    });
  },

  onAddNewItemByPath({
    data,
    paths,
    isFolder,
    workspaceId,
    connectionId,
  }: {
    data: TreeFileSystemItem[];
    paths?: string[];
    isFolder: boolean;
    connectionId: string;
    workspaceId: string;
  }): TreeFileSystemItem[] {
    const title = uuidv4();

    const defaultFolder: TreeFileSystemItem = {
      title,
      id: title,
      icon: 'lucide:folder-open',
      closeIcon: 'lucide:folder',
      children: [],
      paths: [...(paths || []), title],
      status: ETreeFileSystemStatus.edit,
      connectionId,
      workspaceId,
      createdAt: dayjs().toISOString(),
      isFolder: true,
    };

    const defaultFile: TreeFileSystemItem = {
      title,
      id: title,
      icon: 'lucide:file',
      paths: [...(paths || []), title],
      status: ETreeFileSystemStatus.edit,
      connectionId,
      workspaceId,
      isFolder: false,
    };

    const item = isFolder ? defaultFolder : defaultFile;

    if (!paths) {
      return [item, ...data];
    }

    const newTree = tree.updateByPath({
      items: data,
      paths,
      newItem: parent => {
        // add new item in to children
        const children = [
          {
            ...item,
            parentId: parent.id,
            paths: [...parent.paths, item.title],
          },
          ...(parent.children || []),
        ];

        return {
          ...parent,
          children,
        };
      },
    });

    return newTree;
  },

  setAllowEditFileName({
    data,
    itemId,
  }: {
    data: TreeFileSystemItem[];
    itemId: string;
  }): TreeFileSystemItem[] {
    return data.map(item => {
      if (item.title === itemId && item.status === ETreeFileSystemStatus.edit) {
        return {
          ...item,
          status: ETreeFileSystemStatus.edit,
        };
      }

      if (tree.hasChildren(item)) {
        return {
          ...item,
          children: tree.setAllowEditFileName({
            data: item.children ?? [],
            itemId,
          }),
        };
      }

      return item;
    });
  },

  renameByPath({
    items,
    newName,
    paths,
  }: {
    items: TreeFileSystemItem[];
    newName: string;
    paths: string[];
  }): TreeFileSystemItem[] {
    let newTree = tree.updateByPath({
      items: items,
      paths: paths,
      newItem: item => {
        const newItemPaths = [...item.paths.slice(0, -1), newName];

        const updateChildPaths = (
          children: TreeFileSystemItem[],
          parentPaths: string[]
        ): TreeFileSystemItem[] => {
          return children.map(child => {
            const childPaths = [...parentPaths, child.title];
            return {
              ...child,
              paths: childPaths,
              children: child.children
                ? updateChildPaths(child.children, childPaths)
                : undefined,
            };
          });
        };

        // Update children with new paths
        const children = item.children
          ? updateChildPaths(item.children, newItemPaths)
          : undefined;

        return {
          ...item,
          title: newName,
          paths: newItemPaths,
          status: undefined,
          children,
        };
      },
    });

    newTree = tree.sortChildrenByPath({
      items: newTree,
      paths: [...paths.slice(0, -1)],
    });

    return newTree;
  },

  sortChildrenByPath({
    items,
    paths,
  }: {
    items: TreeFileSystemItem[];
    paths?: string[];
  }): TreeFileSystemItem[] {
    if (!paths || paths.length === 0) {
      const sorted = [...items].sort((a, b) => a.title.localeCompare(b.title));

      return sorted;
    }

    return tree.updateByPath({
      items,
      paths,
      newItem: item => {
        // If no children, return item unchanged
        if (!item.children || item.children.length === 0) {
          return item;
        }

        // Sort children by title in ascending order
        const sortedChildren = [...item.children].sort((a, b) =>
          a.title.localeCompare(b.title)
        );

        return {
          ...item,
          children: sortedChildren,
        };
      },
    });
  },
  hasChildren(item: TreeFileSystemItem): boolean {
    return (item.children ?? []).length > 0;
  },

  filterByTitle({
    data,
    title,
  }: {
    data: TreeFileSystemItem[];
    title: string;
  }): TreeFileSystemItem[] {
    const lowerCaseTitle = title.toLowerCase();

    return data.reduce<TreeFileSystemItem[]>((result, item) => {
      const matchesTitle = item.title.toLowerCase().includes(lowerCaseTitle);
      const matchingChildren = item.children
        ? tree.filterByTitle({ data: item.children, title })
        : [];

      if (matchesTitle || matchingChildren.length > 0) {
        result.push({
          ...item,
          children:
            matchingChildren.length > 0 ? matchingChildren : item.children,
        });
      }

      return result;
    }, []);
  },

  flattenTree(items: TreeFileSystemItem[]): TreeFileSystemItem[] {
    return items.reduce<TreeFileSystemItem[]>(
      (result, { children, ...item }) => {
        result.push(item);
        if (children) {
          result.push(...tree.flattenTree(children));
        }
        return result;
      },
      []
    );
  },

  buildTree(items: TreeFileSystemItem[]): TreeFileSystemItem[] {
    const itemMap = new Map<string, TreeFileSystemItem>();
    const rootItems: TreeFileSystemItem[] = [];

    // Initialize map
    items.forEach(item => {
      itemMap.set(item.id, {
        ...item,
        children: item.isFolder ? [] : undefined,
      });
    });

    // Build tree
    items.forEach(item => {
      const mappedItem = itemMap.get(item.id)!;

      if (mappedItem.parentId) {
        const parent = itemMap.get(mappedItem.parentId)!;

        if (parent) {
          parent.children?.push(mappedItem);
          itemMap.set(mappedItem.parentId, parent);
        }
      }
    });

    items.forEach(item => {
      const mappedItem = itemMap.get(item.id)!;

      if (!mappedItem.parentId) {
        rootItems.push({
          ...mappedItem,
        });
      }
    });

    return rootItems;
  },

  // getPathToItem({
  //   current,
  //   targetId,
  //   parentIds = [],
  // }: {
  //   current: TreeFileSystemItem[];
  //   targetId: string;
  //   parentIds?: string[];
  // }): string[] | undefined {
  //   for (const item of current) {
  //     if (item.title === targetId) return parentIds;

  //     const nested = tree.getPathToItem({
  //       current: item.children ?? [],
  //       targetId,
  //       parentIds: [...parentIds, item.title],
  //     });
  //     if (nested) return nested;
  //   }
  // },

  // find(
  //   data: TreeFileSystemItem[],
  //   itemId: string
  // ): TreeFileSystemItem | undefined {
  //   for (const item of data) {
  //     if (item.title === itemId) return item;

  //     if (tree.hasChildren(item)) {
  //       const result = tree.find(item.children ?? [], itemId);
  //       if (result) return result;
  //     }
  //   }
  // },

  // findByPaths(
  //   items: TreeFileSystemItem[],
  //   paths: string[]
  // ): TreeFileSystemItem | undefined {
  //   const [currentPath, ...remainingPaths] = paths;
  //   const treeItem = items.find((item) => item.title === currentPath);

  //   if (remainingPaths.length === 0) {
  //     return treeItem;
  //   } else {
  //     if (treeItem && tree.hasChildren(treeItem)) {
  //       return tree.findByPaths(treeItem.children ?? [], remainingPaths);
  //     }
  //   }
  // },

  //   insertBefore(
  //     data: TreeItem[],
  //     targetId: string,
  //     newItem: TreeItem
  //   ): TreeItem[] {
  //     return data.flatMap((item) => {
  //       if (item.title === targetId) return [newItem, item];

  //       if (tree.hasChildren(item)) {
  //         return {
  //           ...item,
  //           children: tree.insertBefore(item.children ?? [], targetId, newItem),
  //         };
  //       }
  //       return item;
  //     });
  //   },
  //   insertAfter(
  //     data: TreeItem[],
  //     targetId: string,
  //     newItem: TreeItem
  //   ): TreeItem[] {
  //     return data.flatMap((item) => {
  //       if (item.title === targetId) return [item, newItem];

  //       if (tree.hasChildren(item)) {
  //         return {
  //           ...item,
  //           children: tree.insertAfter(item.children ?? [], targetId, newItem),
  //         };
  //       }

  //       return item;
  //     });
  //   },
  //   insertChild(
  //     data: TreeItem[],
  //     targetId: string,
  //     newItem: TreeItem
  //   ): TreeItem[] {
  //     return data.flatMap((item) => {
  //       if (item.title === targetId) {
  //         // already a parent: add as first child
  //         return {
  //           ...item,
  //           // opening item so you can see where item landed
  //           isOpen: true,
  //           children: [newItem, ...(item.children ?? [])],
  //         };
  //       }

  //       if (!tree.hasChildren(item)) return item;

  //       return {
  //         ...item,
  //         children: tree.insertChild(item.children ?? [], targetId, newItem),
  //       };
  //     });
  //   },
};

// function getChildItems(data: TreeItem[], targetId: string) {
//   /**
//    * An empty string is representing the root
//    */
//   if (targetId === "") return data;

//   const targetItem = tree.find(data, targetId);
//   if (!targetItem) {
//     console.error(`missing ${targetItem}`);
//     return;
//   }

//   return targetItem.children;
// }

// export function updateTree(data: TreeItem[], action: TreeAction) {
//   // eslint-disable-next-line no-console
//   console.log("action", action);

//   const item = tree.find(data, action.itemId);
//   if (!item) return data;

//   if (action.type === "instruction") {
//     const instruction = action.instruction;

//     if (instruction.type === "reparent") {
//       const path = tree.getPathToItem({
//         current: data,
//         targetId: action.targetId,
//       });
//       if (!path) {
//         console.error(`missing ${path}`);
//         return;
//       }

//       const desiredId = path[instruction.desiredLevel];
//       let result = tree.remove(data, action.itemId);
//       result = tree.insertAfter(result, desiredId, item);
//       return result;
//     }

//     // the rest of the actions require you to drop on something else
//     if (action.itemId === action.targetId) return data;

//     if (instruction.type === "reorder-above") {
//       let result = tree.remove(data, action.itemId);
//       result = tree.insertBefore(result, action.targetId, item);
//       return result;
//     }

//     if (instruction.type === "reorder-below") {
//       let result = tree.remove(data, action.itemId);
//       result = tree.insertAfter(result, action.targetId, item);
//       return result;
//     }

//     if (instruction.type === "make-child") {
//       let result = tree.remove(data, action.itemId);
//       result = tree.insertChild(result, action.targetId, item);
//       return result;
//     }

//     console.warn("TODO: action not implemented", instruction);

//     return data;
//   }

//   if (action.type === "modal-move") {
//     let result = tree.remove(data, item.title);

//     const siblingItems = getChildItems(result, action.targetId) ?? [];

//     if (siblingItems.length === 0) {
//       if (action.targetId === "") {
//         /**
//          * If the target is the root level, and there are no siblings, then
//          * the item is the only thing in the root level.
//          */
//         result = [item];
//       } else {
//         /**
//          * Otherwise for deeper levels that have no children, we need to
//          * use `insertChild` instead of inserting relative to a sibling.
//          */
//         result = tree.insertChild(result, action.targetId, item);
//       }
//     } else if (action.index === siblingItems.length) {
//       const relativeTo = siblingItems[siblingItems.length - 1];
//       /**
//        * If the position selected is the end, we insert after the last item.
//        */
//       result = tree.insertAfter(result, relativeTo.title, item);
//     } else {
//       const relativeTo = siblingItems[action.index];
//       /**
//        * Otherwise we insert before the existing item in the given position.
//        * This results in the new item being in that position.
//        */
//       result = tree.insertBefore(result, relativeTo.title, item);
//     }

//     return result;
//   }

//   return data;
// }

// export function mapTreeWithPath(items: TreeFileSystemItem[], parentPath = "") {
//   return items.map((item) => {
//     // Construct current path
//     const currentPath = parentPath ? `${parentPath}/${item.title}` : item.title;

//     // Create new item with path property
//     const newItem = {
//       ...item,
//       path: currentPath,
//     };

//     // If item has children, recursively map them
//     if (item.children) {
//       newItem.children = mapTreeWithPath(item.children, currentPath);
//     }

//     return newItem;
//   });
// }

// remove
// function mapTreeWithPath(items, parentPath = "") {
//   return items.map((item) => {
//     // Construct current path
//     const currentPath = parentPath ? `${parentPath}/${item.title}` : item.title;

//     // Create new item with path property
//     const newItem = {
//       ...item,
//       path: currentPath,
//     };

//     // If item has children, recursively map them
//     if (item.children) {
//       newItem.children = mapTreeWithPath(item.children, currentPath);
//     }

//     return newItem;
//   });
// }
