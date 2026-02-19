<script setup lang="ts">
import ManagementExplorerHeader from '~/components/modules/management/explorer/components/ManagementExplorerHeader.vue';
import ManagementExplorerTree from '~/components/modules/management/explorer/components/ManagementExplorerTree.vue';
import { useManagementExplorerTree } from '~/components/modules/management/explorer/hooks/useManagementExplorerTree';
import { useAppContext } from '~/core/contexts/useAppContext';
import { TabViewType } from '~/core/stores/useTabViewsStore';

const { tabViewStore } = useAppContext();

const treePanelRef = useTemplateRef<InstanceType<
  typeof ManagementExplorerTree
> | null>('treePanelRef');

const {
  contextMenuItems,
  explorerStorageKey,
  mappedExplorerFileTreeData,
  onAddFile,
  onAddFolder,
  onCancelEditNode,
  onClearContextMenu,
  onClickNode,
  onCollapsedExplorer,
  onMoveNode,
  onRenameFile,
  onSelectNode,
  onTreeContextMenu,
  searchInput,
  validateRename,
} = useManagementExplorerTree({
  startEditingNode: nodeId => treePanelRef.value?.startEditing(nodeId),
  focusNode: nodeId => treePanelRef.value?.focusItem(nodeId),
  collapseAll: () => treePanelRef.value?.collapseAll(),
});

watch(
  () => tabViewStore.activeTab,
  activeTab => {
    if (!activeTab) {
      treePanelRef.value?.clearSelection();
      return;
    }

    if (treePanelRef.value?.isMouseInside) return;

    if (activeTab?.type === TabViewType.CodeQuery) {
      const nodeId = activeTab.metadata?.treeNodeId;

      if (typeof nodeId === 'string') {
        treePanelRef.value?.focusItem(nodeId);
      }
    }
  },
  { flush: 'post', immediate: true }
);
</script>

<template>
  <div class="flex flex-col h-full w-full overflow-y-auto">
    <ManagementExplorerHeader
      v-model="searchInput"
      @add-file="onAddFile"
      @add-folder="onAddFolder"
      @collapse-all="onCollapsedExplorer"
    />

    <ManagementExplorerTree
      ref="treePanelRef"
      :tree-data="mappedExplorerFileTreeData"
      :storage-key="explorerStorageKey"
      :context-menu-items="contextMenuItems"
      :validate-rename="validateRename"
      @click-node="onClickNode"
      @select-node="onSelectNode"
      @rename-node="onRenameFile"
      @cancel-rename="onCancelEditNode"
      @context-node="onTreeContextMenu"
      @move-node="onMoveNode"
      @clear-context-menu="onClearContextMenu"
    />
  </div>
</template>
