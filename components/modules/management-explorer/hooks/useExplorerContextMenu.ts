import { computed, ref, nextTick } from 'vue';
import type { TreeFileSystemItem } from '~/components/base/Tree';
import {
  ContextMenuItemType,
  type ContextMenuItem,
} from '~/components/base/context-menu/menuContext.type';

export interface ExplorerContextMenuOptions {
  resolveNodeById: (nodeId: string) => TreeFileSystemItem | null;
  onCreateFile: (nodeId?: string | null) => void;
  onCreateFolder: (nodeId?: string | null) => void;
  onRename: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
}

export const useExplorerContextMenu = (options: ExplorerContextMenuOptions) => {
  const selectedItem = ref<TreeFileSystemItem | null>(null);

  const onRightClickItem = (nodeId: string) => {
    selectedItem.value = options.resolveNodeById(nodeId);
  };

  const onClearContextMenu = () => {
    selectedItem.value = null;
  };

  const contextMenuItems = computed<ContextMenuItem[]>(() => {
    const items: ContextMenuItem[] = [];
    const selected = selectedItem.value;
    const canCreateInCurrentNode = selected?.isFolder || !selected;

    if (selected) {
      items.push({
        title: selected.title,
        type: ContextMenuItemType.LABEL,
      });
    }

    if (canCreateInCurrentNode) {
      items.push({
        title: 'Add new file',
        icon: 'lucide:file-plus-2',
        type: ContextMenuItemType.ACTION,
        select: () => {
          const targetNodeId = selectedItem.value?.id;
          nextTick(() => options.onCreateFile(targetNodeId));
        },
      });

      items.push({
        title: 'Add new folder',
        icon: 'lucide:folder-plus',
        type: ContextMenuItemType.ACTION,
        select: () => {
          const targetNodeId = selectedItem.value?.id;
          nextTick(() => options.onCreateFolder(targetNodeId));
        },
      });
    }

    if (selected) {
      if (canCreateInCurrentNode) {
        items.push({
          type: ContextMenuItemType.SEPARATOR,
        });
      }

      items.push({
        title: 'Rename...',
        icon: 'lucide:pencil',
        type: ContextMenuItemType.ACTION,
        select: () => {
          const targetNodeId = selectedItem.value?.id;
          if (!targetNodeId) return;
          nextTick(() => options.onRename(targetNodeId));
        },
      });

      items.push({
        title: 'Delete',
        icon: 'lucide:trash',
        type: ContextMenuItemType.ACTION,
        select: () => {
          const targetNode = selectedItem.value;
          if (!targetNode) return;
          nextTick(() => options.onDelete(targetNode.id));
        },
      });
    }

    return items;
  });

  return {
    selectedItem,
    contextMenuItems,
    onRightClickItem,
    onClearContextMenu,
  };
};
