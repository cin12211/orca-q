<script setup lang="ts">
import ManagementExplorerTree from '~/components/modules/management/explorer/components/ManagementExplorerTree.vue';
import { useManagementExplorerTree } from '~/components/modules/management/explorer/hooks/useManagementExplorerTree';
import { useAppContext } from '~/core/contexts/useAppContext';
import { TabViewType } from '~/core/stores/useTabViewsStore';
import { ManagementSidebarHeader } from '../shared';

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
  isExpandedAll,
  onToggleCollapseExplorer,
  onMoveNode,
  onRenameFile,
  onSelectNode,
  onTreeContextMenu,
  searchInput,
  validateRename,
} = useManagementExplorerTree({
  startEditingNode: nodeId => treePanelRef.value?.startEditing(nodeId),
  focusNode: (nodeId: string) => treePanelRef.value?.focusItem(nodeId),
  collapseAll: () => treePanelRef.value?.collapseAll(),
  expandAll: () => treePanelRef.value?.expandAll(),
  isExpandedAll: computed(() => treePanelRef.value?.isExpandedAll ?? false),
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
    <ManagementSidebarHeader
      v-model:search="searchInput"
      title="Explorer"
      :show-search="true"
    >
      <template #actions>
        <Tooltip>
          <TooltipTrigger as-child>
            <Button size="iconSm" variant="ghost" @click="onAddFile">
              <Icon
                name="hugeicons:file-add"
                class="size-4! min-w-4 text-muted-foreground"
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent> New File </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger as-child>
            <Button size="iconSm" variant="ghost" @click="onAddFolder">
              <Icon
                name="hugeicons:folder-add"
                class="size-4! min-w-4 text-muted-foreground"
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent> New Folder </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              size="iconSm"
              variant="ghost"
              @click="onToggleCollapseExplorer"
            >
              <Icon
                :name="
                  isExpandedAll
                    ? 'hugeicons:unfold-less'
                    : 'hugeicons:unfold-more'
                "
                class="size-4! min-w-4 text-muted-foreground"
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {{ isExpandedAll ? 'Collapse All' : 'Expand All' }}
          </TooltipContent>
        </Tooltip>
      </template>
    </ManagementSidebarHeader>

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
