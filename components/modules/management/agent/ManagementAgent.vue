<script setup lang="ts">
import { refDebounced } from '@vueuse/core';
import { Tooltip, TooltipContent, TooltipTrigger } from '#components';
import FileTree from '~/components/base/tree-folder/FileTree.vue';
import type { FileNode } from '~/components/base/tree-folder/types';
import { useAgentWorkspace } from '~/components/modules/agent/hooks/useDbAgentWorkspace';
import { DEFAULT_DEBOUNCE_INPUT } from '~/core/constants';
import { useAppContext } from '~/core/contexts/useAppContext';
import { ManagementSidebarHeader } from '../shared';

const { wsStateStore } = useAppContext();
const { workspaceId } = toRefs(wsStateStore);

const fileTreeRef = useTemplateRef<InstanceType<typeof FileTree> | null>(
  'fileTreeRef'
);

const searchInput = shallowRef('');
const debouncedSearch = refDebounced(searchInput, DEFAULT_DEBOUNCE_INPUT);

const {
  treeData,
  selectedNodeId,
  defaultExpandedNodeIds,
  sectionCounts,
  selectNode,
  startNewChat,
} = useAgentWorkspace();

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

const filteredTreeData = computed<Record<string, FileNode>>(() => {
  if (!debouncedSearch.value.trim()) {
    return treeData.value;
  }

  const query = debouncedSearch.value.trim().toLowerCase();
  const includedNodeIds = new Set<string>();
  const source = treeData.value;

  Object.values(source).forEach(node => {
    if (!node.name.toLowerCase().includes(query)) {
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

const validateRename = (_nodeId: string, _newName: string): true => true;

const isTreeCollapsed = computed(() =>
  fileTreeRef.value ? !fileTreeRef.value.isExpandedAll : false
);

const handleToggleTree = () => {
  if (isTreeCollapsed.value) {
    fileTreeRef.value?.expandAll();
    return;
  }

  fileTreeRef.value?.collapseAll();
};

watch(
  () => selectedNodeId.value,
  async nodeId => {
    await nextTick();
    if (!nodeId || !filteredTreeData.value[nodeId]) {
      return;
    }

    fileTreeRef.value?.focusItem(nodeId);
  },
  { flush: 'post', immediate: true }
);
</script>

<template>
  <div class="flex h-full w-full flex-col overflow-hidden">
    <ManagementSidebarHeader
      v-model:search="searchInput"
      title="Agent Control"
      :show-search="true"
      :show-connection="true"
      :show-schema="true"
      :workspace-id="workspaceId"
      search-placeholder="Search controls..."
    >
      <template #actions>
        <Tooltip>
          <TooltipTrigger as-child>
            <Button size="iconSm" variant="ghost" @click="startNewChat">
              <Icon name="lucide:square-pen" class="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent> New thread </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger as-child>
            <Button size="iconSm" variant="ghost" @click="handleToggleTree">
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

    <div class="border-b px-2 pb-2">
      <div class="grid grid-cols-2 gap-2">
        <div class="rounded-xl border bg-muted/30 px-2.5 py-2">
          <p class="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Rules
          </p>
          <p class="mt-1 text-sm font-medium">{{ sectionCounts.rules }}</p>
        </div>
        <div class="rounded-xl border bg-muted/30 px-2.5 py-2">
          <p class="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Skills
          </p>
          <p class="mt-1 text-sm font-medium">{{ sectionCounts.skills }}</p>
        </div>
        <div class="rounded-xl border bg-muted/30 px-2.5 py-2">
          <p class="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            MCP
          </p>
          <p class="mt-1 text-sm font-medium">{{ sectionCounts.mcp }}</p>
        </div>
        <div class="rounded-xl border bg-muted/30 px-2.5 py-2">
          <p class="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            History
          </p>
          <p class="mt-1 text-sm font-medium">{{ sectionCounts.history }}</p>
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-hidden">
      <div
        v-if="Object.keys(filteredTreeData).length === 0"
        class="flex h-full flex-col items-center justify-center px-4 text-center text-muted-foreground"
      >
        <Icon name="lucide:search-x" class="mb-3 size-8 opacity-50" />
        <p class="text-sm">No matching controls</p>
        <p class="mt-1 text-xs">
          Try searching for a section, rule, skill, or saved thread.
        </p>
      </div>

      <FileTree
        v-else
        ref="fileTreeRef"
        class="pt-1"
        storage-key="agent-control-tree"
        :initial-data="filteredTreeData"
        :init-expanded-ids="defaultExpandedNodeIds"
        :allow-drag-and-drop="false"
        :allow-sort="false"
        :validate-rename="validateRename"
        @click="nodeId => selectNode(nodeId)"
      />
    </div>
  </div>
</template>
