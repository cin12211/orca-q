<script setup lang="ts">
import { Tooltip, TooltipContent, TooltipTrigger } from '#components';
import AgentEmptyState from '~/components/modules/management/agent/components/AgentEmptyState.vue';
import ManagementAgentHistoryTree from '~/components/modules/management/agent/components/ManagementAgentHistoryTree.vue';
import { useManagementAgentHistoryTree } from '~/components/modules/management/agent/hooks/useManagementAgentHistoryTree';
import { useAppContext } from '~/core/contexts/useAppContext';
import { ManagementSidebarHeader } from '../shared';

const { wsStateStore } = useAppContext();
const { workspaceId } = toRefs(wsStateStore);

type ManagementAgentHistoryTreeExpose = {
  collapseAll: () => void;
  expandAll: () => void;
  focusItem: (nodeId: string) => void;
  isExpandedAll: boolean;
};

const treePanelRef = useTemplateRef<ManagementAgentHistoryTreeExpose | null>(
  'treePanelRef'
);

const {
  contextMenuItems,
  defaultExpandedNodeIds,
  filteredHistoryTreeData,
  historySectionId,
  historyStorageKey,
  isExpandedAll,
  onClearContextMenu,
  onClickNode,
  onCreateThread,
  onDeleteHistory,
  onToggleCollapseHistory,
  onTreeContextMenu,
  searchInput,
} = useManagementAgentHistoryTree({
  focusNode: nodeId => treePanelRef.value?.focusItem(nodeId),
  collapseAll: () => treePanelRef.value?.collapseAll(),
  expandAll: () => treePanelRef.value?.expandAll(),
  isExpandedAll: computed(() => treePanelRef.value?.isExpandedAll ?? false),
});

const isTreeCollapsed = computed(() => !isExpandedAll.value);

const isHistoryEmpty = computed(() => {
  const sectionNode = filteredHistoryTreeData.value[historySectionId];
  return !sectionNode || (sectionNode.children?.length ?? 0) === 0;
});
</script>

<template>
  <div class="flex h-full w-full flex-col overflow-hidden">
    <ManagementSidebarHeader
      v-model:search="searchInput"
      title="Chat History"
      :show-search="true"
      :show-connection="true"
      :show-schema="false"
      :workspace-id="workspaceId"
      search-placeholder="Search threads..."
    >
      <template #actions>
        <Tooltip>
          <TooltipTrigger as-child>
            <Button size="iconSm" variant="ghost" @click="onCreateThread">
              <Icon name="hugeicons:plus-sign" class="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent> New thread </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              size="iconSm"
              variant="ghost"
              @click="onToggleCollapseHistory"
            >
              <Icon
                :name="
                  isTreeCollapsed
                    ? 'hugeicons:unfold-more'
                    : 'hugeicons:unfold-less'
                "
                class="size-4"
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {{ isTreeCollapsed ? 'Expand all' : 'Collapse all' }}
          </TooltipContent>
        </Tooltip>
      </template>
    </ManagementSidebarHeader>

    <div class="flex flex-1 flex-col overflow-hidden">
      <div class="flex-1 overflow-y-auto">
        <AgentEmptyState
          v-if="isHistoryEmpty"
          title="No chat history yet"
          description="Start a new thread to ask about schema design, query plans, reports, or safe mutations."
          action-label="Start chat"
          @action="onCreateThread"
        />

        <ManagementAgentHistoryTree
          v-else
          ref="treePanelRef"
          :context-menu-items="contextMenuItems"
          :history-section-id="historySectionId"
          :storage-key="historyStorageKey"
          :tree-data="filteredHistoryTreeData"
          :init-expanded-ids="defaultExpandedNodeIds"
          @click-node="onClickNode"
          @context-node="onTreeContextMenu"
          @clear-context-menu="onClearContextMenu"
          @delete-history="onDeleteHistory"
          @new-thread="onCreateThread"
        />
      </div>
    </div>
  </div>
</template>
