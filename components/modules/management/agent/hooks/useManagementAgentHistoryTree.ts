import { refDebounced } from '@vueuse/core';
import type { ComputedRef } from 'vue';
import {
  ContextMenuItemType,
  type ContextMenuItem,
} from '~/components/base/context-menu/menuContext.type';
import type { FileNode } from '~/components/base/tree-folder/types';
import { useAgentWorkspace } from '~/components/modules/agent/hooks/useDbAgentWorkspace';
import { useWorkspaceConnectionRoute } from '~/core/composables/useWorkspaceConnectionRoute';
import { DEFAULT_DEBOUNCE_INPUT } from '~/core/constants';
import { useWSStateStore } from '~/core/stores';
import { TabViewType, useTabViewsStore } from '~/core/stores/useTabViewsStore';

type UseManagementAgentHistoryTreeOptions = {
  collapseAll: () => void;
  expandAll: () => void;
  focusNode: (nodeId: string) => void;
  isExpandedAll: ComputedRef<boolean>;
  onRename?: (nodeId: string) => void;
};

const HISTORY_TREE_STORAGE_KEY = 'agent-history-tree';

const includeDescendants = (
  source: Record<string, FileNode>,
  nodeId: string,
  target: Set<string>
) => {
  if (target.has(nodeId)) {
    return;
  }

  target.add(nodeId);

  const children = source[nodeId]?.children || [];
  children.forEach(childId => includeDescendants(source, childId, target));
};

export const useManagementAgentHistoryTree = (
  options: UseManagementAgentHistoryTreeOptions
) => {
  const wsStateStore = useWSStateStore();
  const tabViewStore = useTabViewsStore();
  const { workspaceId, connectionId } = useWorkspaceConnectionRoute();
  const searchInput = shallowRef('');
  const debouncedSearch = refDebounced(searchInput, DEFAULT_DEBOUNCE_INPUT);
  const contextMenuItems = ref<ContextMenuItem[]>([]);

  const {
    currentWorkspaceId,
    histories,
    selectedNodeId,
    selectNode,
    startNewChat,
    deleteHistory,
    renameHistory,
    SECTION_NODE_IDS: sectionNodeIds,
  } = useAgentWorkspace();

  watchEffect(() => {
    currentWorkspaceId.value = workspaceId.value || '';
  });

  const historyTreeData = computed<Record<string, FileNode>>(() => {
    const sectionId = sectionNodeIds.history;
    const historyNodes = histories.value.map<FileNode>(history => ({
      id: `agent-history-${history.id}`,
      parentId: sectionId,
      name: history.title,
      type: 'file',
      depth: 1,
      iconOpen: 'hugeicons:chatting-01',
      iconClose: 'hugeicons:chatting-01',
      data: {
        preview: history.preview,
        updatedAt: history.updatedAt,
      },
    }));

    return {
      [sectionId]: {
        id: sectionId,
        parentId: null,
        name: 'Chat History',
        type: 'folder',
        depth: 0,
        iconOpen: 'hugeicons:clock-05',
        iconClose: 'hugeicons:clock-05',
        children: historyNodes.map(node => node.id),
      },
      ...Object.fromEntries(historyNodes.map(node => [node.id, node])),
    };
  });

  const filteredHistoryTreeData = computed<Record<string, FileNode>>(() => {
    if (!debouncedSearch.value.trim()) {
      return historyTreeData.value;
    }

    const query = debouncedSearch.value.trim().toLowerCase();
    const includedNodeIds = new Set<string>();
    const source = historyTreeData.value;

    Object.values(source).forEach(node => {
      const preview =
        typeof node.data?.preview === 'string' ? node.data.preview : '';

      if (
        !node.name.toLowerCase().includes(query) &&
        !preview.toLowerCase().includes(query)
      ) {
        return;
      }

      includeDescendants(source, node.id, includedNodeIds);

      let currentParentId = node.parentId;
      while (currentParentId) {
        includedNodeIds.add(currentParentId);
        currentParentId = source[currentParentId]?.parentId || null;
      }
    });

    const filtered: Record<string, FileNode> = {};

    includedNodeIds.forEach(nodeId => {
      const node = source[nodeId];
      if (!node) {
        return;
      }

      filtered[nodeId] = {
        ...node,
        children: (node.children || []).filter(childId =>
          includedNodeIds.has(childId)
        ),
      };
    });

    return filtered;
  });

  const openAgentTab = async (historyId?: string) => {
    if (!workspaceId.value || !connectionId.value) {
      return;
    }

    const tabId = 'agent-workspace';

    await tabViewStore.openTab({
      id: tabId,
      workspaceId: workspaceId.value,
      connectionId: connectionId.value,
      schemaId: wsStateStore.schemaId || '',
      name: 'AI Agent',
      icon: 'hugeicons:robotic',
      type: TabViewType.AgentChat,
      routeName: 'workspaceId-connectionId-agent-tabViewId',
      routeParams: {
        tabViewId: tabId,
        connectionId: connectionId.value,
      },
      metadata: {
        type: TabViewType.AgentChat,
        historyId,
      },
    });

    await tabViewStore.selectTab(tabId);
  };

  const onCreateThread = async () => {
    startNewChat();
    await openAgentTab();
  };

  const onDeleteHistory = (nodeId: string) => {
    if (!nodeId.startsWith('agent-history-')) {
      return;
    }

    deleteHistory(nodeId.replace('agent-history-', ''));
  };

  const onClickNode = async (nodeId: string) => {
    if (nodeId === sectionNodeIds.history) {
      return;
    }

    if (!nodeId.startsWith('agent-history-')) {
      return;
    }

    selectNode(nodeId);
    await openAgentTab(nodeId.replace('agent-history-', ''));
  };

  const onRenameHistory = (historyId: string, nextTitle: string) => {
    renameHistory(historyId, nextTitle);
  };

  const onTreeContextMenu = (nodeId: string) => {
    if (nodeId === sectionNodeIds.history) {
      contextMenuItems.value = [
        {
          title: 'New Thread',
          icon: 'hugeicons:quill-write-02',
          type: ContextMenuItemType.ACTION,
          select: () => void onCreateThread(),
        },
      ];
      return;
    }

    if (!nodeId.startsWith('agent-history-')) {
      contextMenuItems.value = [];
      return;
    }

    const historyId = nodeId.replace('agent-history-', '');

    contextMenuItems.value = [
      {
        title: 'Open Thread',
        icon: 'hugeicons:chat-spark-01',
        type: ContextMenuItemType.ACTION,
        select: () => {
          selectNode(nodeId);
          void openAgentTab(historyId);
        },
      },
      {
        title: 'Rename Thread',
        icon: 'hugeicons:edit-02',
        type: ContextMenuItemType.ACTION,
        select: () => {
          options.onRename?.(nodeId);
        },
      },
      {
        type: ContextMenuItemType.SEPARATOR,
      },
      {
        title: 'New Thread',
        icon: 'hugeicons:quill-write-02',
        type: ContextMenuItemType.ACTION,
        select: () => void onCreateThread(),
      },
      {
        type: ContextMenuItemType.SEPARATOR,
      },
      {
        title: 'Delete Thread',
        icon: 'hugeicons:delete-02',
        type: ContextMenuItemType.ACTION,
        select: () => deleteHistory(historyId),
      },
    ];
  };

  const onClearContextMenu = () => {
    contextMenuItems.value = [];
  };

  const onToggleCollapseHistory = () => {
    if (options.isExpandedAll.value) {
      options.collapseAll();
      return;
    }

    options.expandAll();
  };

  watch(
    () => selectedNodeId.value,
    async nodeId => {
      await nextTick();
      if (!nodeId || !filteredHistoryTreeData.value[nodeId]) {
        return;
      }

      options.focusNode(nodeId);
    },
    { flush: 'post', immediate: true }
  );

  return {
    contextMenuItems,
    defaultExpandedNodeIds: [sectionNodeIds.history],
    filteredHistoryTreeData,
    historySectionId: sectionNodeIds.history,
    historyStorageKey: HISTORY_TREE_STORAGE_KEY,
    isExpandedAll: options.isExpandedAll,
    onClearContextMenu,
    onClickNode,
    onCreateThread,
    onDeleteHistory,
    onRenameHistory,
    onToggleCollapseHistory,
    onTreeContextMenu,
    searchInput,
  };
};
