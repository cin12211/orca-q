import { refDebounced } from '@vueuse/core';
import { storeToRefs } from 'pinia';
import dayjs from 'dayjs';
import {
  type TreeFileSystem,
  type TreeFileSystemItem,
} from '~/components/base/Tree';
import { createTreePersistencePlugin } from '~/components/base/tree-folder';
import type {
  DropPosition,
  FileNode,
  TreePersistenceExtension,
} from '~/components/base/tree-folder/types';
import { useTabManagement } from '~/core/composables/useTabManagement';
import { useWorkspaceConnectionRoute } from '~/core/composables/useWorkspaceConnectionRoute';
import { DEFAULT_DEBOUNCE_INPUT } from '~/core/constants';
import { uuidv4 } from '~/core/helpers';
import { useExplorerFileStore } from '~/core/stores';
import { useExplorerContextMenu } from './useExplorerContextMenu';

interface UseManagementExplorerTreeOptions {
  startEditingNode: (nodeId: string) => void;
  focusNode: (nodeId: string) => void;
  collapseAll: () => void;
  expandAll: () => void;
  isExpandedAll: Ref<boolean>;
}

const mapTreeToFileNodes = (tree: TreeFileSystem): Record<string, FileNode> => {
  const nodes: Record<string, FileNode> = {};

  const buildNodes = (
    items: TreeFileSystemItem[],
    parentId: string | null,
    depth: number
  ) => {
    items.forEach(item => {
      const childIds = item.children?.map(child => child.id) ?? [];

      nodes[item.id] = {
        id: item.id,
        parentId,
        name: item.title,
        type: item.isFolder ? 'folder' : 'file',
        depth,
        iconOpen: item.icon,
        iconClose: item.closeIcon || item.icon,
        iconClass: item.iconClass,
        children: item.isFolder ? childIds : undefined,
      };

      if (item.children?.length) {
        buildNodes(item.children, item.id, depth + 1);
      }
    });
  };

  buildNodes(tree, null, 0);

  return nodes;
};

export const useManagementExplorerTree = ({
  startEditingNode,
  focusNode,
  collapseAll,
  expandAll,
  isExpandedAll,
}: UseManagementExplorerTreeOptions) => {
  const { workspaceId, connectionId } = useWorkspaceConnectionRoute();
  const explorerFileStore = useExplorerFileStore();
  const { openCodeQueryTab } = useTabManagement();

  const searchInput = shallowRef('');
  const debouncedSearch = refDebounced(searchInput, DEFAULT_DEBOUNCE_INPUT);

  const { treeNodeRef } = storeToRefs(explorerFileStore);
  const selectedNodeIds = shallowRef<string[]>([]);

  const mappedExplorerFiles = computed(() => {
    if (debouncedSearch.value) {
      return treeNodeRef.value.searchByTitle(debouncedSearch.value);
    }

    return treeNodeRef.value.tree;
  });

  const mappedExplorerFileTreeData = computed(() => {
    return mapTreeToFileNodes(mappedExplorerFiles.value);
  });

  const explorerStorageKey = computed(() => String(workspaceId.value));

  //TODO: config for case want to sync tree to remote api
  // const explorerTreePersistence = shallowRef<TreePersistenceExtension>(
  //   createTreePersistencePlugin({
  //     mode: 'auto',
  //   })
  // );

  const onAddNewItem = async ({
    nodeId,
    isFolder,
  }: {
    nodeId?: string | null;
    isFolder: boolean;
  }) => {
    const parentNode = nodeId ? treeNodeRef.value.findNode(nodeId) : null;

    const defaultFolder = {
      title: '',
      id: uuidv4(),
      icon: 'lucide:folder-open',
      closeIcon: 'lucide:folder',
      connectionId: connectionId.value,
      workspaceId: workspaceId.value,
      createdAt: dayjs().toISOString(),
      isFolder: true,
      path: '',
      children: [],
    };

    const defaultFile = {
      title: '',
      id: uuidv4(),
      icon: 'lucide:file',
      connectionId: connectionId.value,
      workspaceId: workspaceId.value,
      createdAt: dayjs().toISOString(),
      isFolder: false,
      path: '',
      children: undefined,
    };

    const item = isFolder ? defaultFolder : defaultFile;

    treeNodeRef.value.insertNode(parentNode?.id || null, item);
    treeNodeRef.value.sortByTitle();

    await nextTick();
    focusNode(item.id);
    startEditingNode(item.id);
  };

  const getTargetParentId = () => {
    if (selectedNodeIds.value.length === 0) {
      return null;
    }

    const firstSelectedId = selectedNodeIds.value[0];
    const node = treeNodeRef.value.findNode(firstSelectedId);

    if (!node) {
      return null;
    }

    if (node.isFolder) {
      return node.id;
    }

    return node.parentId;
  };

  const onAddFile = () => {
    onAddNewItem({
      nodeId: getTargetParentId(),
      isFolder: false,
    });
  };

  const onAddFolder = () => {
    onAddNewItem({
      nodeId: getTargetParentId(),
      isFolder: true,
    });
  };

  const onSelectNode = (nodeIds: string[]) => {
    selectedNodeIds.value = nodeIds;
  };

  const onDeleteNodeById = (id: string) => {
    treeNodeRef.value.deleteNode(id);
  };

  const onCancelEditNode = (nodeId: string) => {
    const node = treeNodeRef.value.findNode(nodeId);
    if (!node) return;

    if (node.title === '') {
      onDeleteNodeById(node.id);
    }
  };

  const onRenameFile = (nodeId: string, newName: string) => {
    const node = treeNodeRef.value.findNode(nodeId);
    if (!node) return;

    const trimmedName = newName.trim();
    const isDuplicateName = treeNodeRef.value.isExitNodeNameInFolder(
      trimmedName,
      node.id,
      node.parentId || ''
    );

    if (isDuplicateName) {
      return;
    }

    if (!trimmedName) {
      onCancelEditNode(nodeId);
      return;
    }

    treeNodeRef.value.updateNode(node.id, { title: trimmedName });
    nextTick(() => {
      focusNode(node.id);
    });
  };

  const validateRename = (nodeId: string, newName: string): string | true => {
    const node = treeNodeRef.value.findNode(nodeId);
    if (!node) return true;

    const trimmedName = newName.trim();
    if (!trimmedName) return 'Name cannot be empty';

    if (
      treeNodeRef.value.isExitNodeNameInFolder(
        trimmedName,
        node.id,
        node.parentId || ''
      )
    ) {
      return 'A file or folder with this name already exists';
    }

    return true;
  };

  const onSetAllowEditFileName = (nodeId: string) => {
    const node = treeNodeRef.value.findNode(nodeId);
    if (!node) return;

    focusNode(node.id);
    startEditingNode(node.id);
  };

  const onMoveNode = (
    movedNodeIds: string | string[],
    targetId: string,
    _position: DropPosition
  ) => {
    const targetNode = treeNodeRef.value.findNode(targetId);
    if (!targetNode) {
      return;
    }

    const nextParentId = targetNode.isFolder
      ? targetNode.id
      : targetNode.parentId;
    const ids = Array.isArray(movedNodeIds) ? movedNodeIds : [movedNodeIds];

    ids.forEach(nodeId => {
      const movingNode = treeNodeRef.value.findNode(nodeId);
      if (!movingNode) {
        return;
      }

      if ((movingNode.parentId || null) === (nextParentId || null)) {
        return;
      }

      treeNodeRef.value.moveNode(movingNode.id, nextParentId || null);
      treeNodeRef.value.sortByTitle();
    });
  };

  const explorerContextMenu = useExplorerContextMenu({
    resolveNodeById: nodeId => treeNodeRef.value.findNode(nodeId),
    onCreateFile: nodeId => {
      onAddNewItem({
        nodeId,
        isFolder: false,
      });
    },
    onCreateFolder: nodeId => {
      onAddNewItem({
        nodeId,
        isFolder: true,
      });
    },
    onRename: nodeId => {
      onSetAllowEditFileName(nodeId);
    },
    onDelete: nodeId => {
      onDeleteNodeById(nodeId);
    },
  });

  const onToggleCollapseExplorer = () => {
    if (isExpandedAll.value) {
      collapseAll();
    } else {
      expandAll();
    }
  };

  const onClickNode = (nodeId: string) => {
    const item = treeNodeRef.value.findNode(nodeId);
    if (!item || item.isFolder) {
      return;
    }

    openCodeQueryTab({
      id: item.id,
      name: item.title,
      icon: item.icon,
    });
  };

  return {
    contextMenuItems: explorerContextMenu.contextMenuItems,
    explorerStorageKey,
    mappedExplorerFileTreeData,
    onAddFile,
    onAddFolder,
    onSelectNode,
    onCancelEditNode,
    onClearContextMenu: explorerContextMenu.onClearContextMenu,
    onClickNode,
    isExpandedAll,
    onToggleCollapseExplorer,
    onMoveNode,
    onRenameFile,
    onTreeContextMenu: explorerContextMenu.onRightClickItem,
    searchInput,
    validateRename,
  };
};
