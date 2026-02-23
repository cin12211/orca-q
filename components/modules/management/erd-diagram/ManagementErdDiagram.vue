<script setup lang="ts">
import { refDebounced } from '@vueuse/core';
import FileTree from '~/components/base/tree-folder/FileTree.vue';
import type { FileNode } from '~/components/base/tree-folder/types';
import { DEFAULT_DEBOUNCE_INPUT } from '~/core/constants';
import { useAppContext } from '~/core/contexts/useAppContext';
import { TabViewType } from '~/core/stores/useTabViewsStore';
import { buildTableNodeId } from '../../erd-diagram/utils';
import { ERDFolderType } from '../schemas/constants';
import { ManagementSidebarHeader } from '../shared';

const { schemaStore, connectToConnection, wsStateStore, tabViewStore } =
  useAppContext();
const { activeSchema } = toRefs(schemaStore);
const { connectionId, workspaceId, schemaId } = toRefs(wsStateStore);

const isRefreshing = ref(false);
const fileTreeRef = ref<InstanceType<typeof FileTree> | null>(null);

const searchInput = shallowRef('');
const debouncedSearch = refDebounced(searchInput, DEFAULT_DEBOUNCE_INPUT);

const defaultExpandedKeys = [ERDFolderType.Root];
/**
 * Build flat FileNode data from schema tables
 */
const fileTreeData = computed<Record<string, FileNode>>(() => {
  const nodes: Record<string, FileNode> = {};
  const tables = activeSchema?.value?.tables || [];

  // Root folder: All Tables
  nodes[ERDFolderType.Root] = {
    id: ERDFolderType.Root,
    parentId: null,
    name: 'All Tables',
    type: 'folder',
    depth: 0,
    iconOpen: 'hugeicons:structure-folder',
    iconClose: 'hugeicons:structure-folder',

    children: [],
    data: { tabViewType: TabViewType.AllERD },
  };

  // Child items: individual tables
  tables.forEach(tableName => {
    const refId = buildTableNodeId({
      schemaName: activeSchema.value?.name || '',
      tableName,
    });

    nodes[refId] = {
      id: refId,
      parentId: ERDFolderType.Root,
      name: tableName,
      type: 'file',
      depth: 1,
      iconOpen: 'hugeicons:flowchart-01',
      iconClose: 'hugeicons:flowchart-01',
      data: { tabViewType: TabViewType.DetailERD },
    };

    nodes[ERDFolderType.Root].children!.push(refId);
  });

  // Filter by search
  if (debouncedSearch.value) {
    const query = debouncedSearch.value.toLowerCase();
    const filteredNodes: Record<string, FileNode> = {};

    const rootNode = nodes[ERDFolderType.Root];
    const matchingChildren = rootNode.children?.filter(childId => {
      const child = nodes[childId];
      return child.name.toLowerCase().includes(query);
    });

    if (matchingChildren && matchingChildren.length > 0) {
      filteredNodes[ERDFolderType.Root] = {
        ...rootNode,
        children: matchingChildren,
      };
      matchingChildren.forEach(childId => {
        filteredNodes[childId] = nodes[childId];
      });
    }

    return filteredNodes;
  }

  return nodes;
});

const onRefreshSchema = async () => {
  if (!connectionId.value) {
    throw new Error('No connection selected');
  }

  isRefreshing.value = true;
  await connectToConnection({
    wsId: workspaceId.value,
    connId: connectionId.value,
    isRefresh: true,
  });

  isRefreshing.value = false;
};

const isTreeCollapsed = computed(() => {
  return fileTreeRef.value ? !fileTreeRef.value.isExpandedAll : true;
});

const onToggleCollapse = () => {
  if (isTreeCollapsed.value) {
    fileTreeRef.value?.expandAll();
  } else {
    fileTreeRef.value?.collapseAll();
  }
};

// Navigation functions
const openErdTab = async (node: FileNode) => {
  if (!workspaceId.value) {
    throw new Error('No workspace selected');
  }

  if (!connectionId.value) {
    throw new Error('No connection selected');
  }

  const tabViewType = node.data?.tabViewType as TabViewType | undefined;
  if (
    tabViewType !== TabViewType.AllERD &&
    tabViewType !== TabViewType.DetailERD
  ) {
    return;
  }

  const currentSchemaId = schemaId.value || activeSchema.value?.name || '';
  const isOverview = tabViewType === TabViewType.AllERD;

  const tableId = isOverview
    ? undefined
    : node.id ||
      buildTableNodeId({
        schemaName: activeSchema.value?.name || '',
        tableName: node.name,
      });

  const tabId = isOverview
    ? `erd-overview-${currentSchemaId || 'all'}`
    : `erd-${tableId}`;

  await tabViewStore.openTab({
    id: tabId,
    name: isOverview ? 'All Tables' : node.name,
    icon: node.iconOpen || node.iconClose || 'hugeicons:structure-folder',
    iconClass: node.iconClass,
    type: tabViewType,
    routeName: isOverview
      ? 'workspaceId-connectionId-erd'
      : 'workspaceId-connectionId-erd-tableId',
    routeParams: isOverview
      ? {
          workspaceId: workspaceId.value,
          connectionId: connectionId.value,
        }
      : {
          workspaceId: workspaceId.value,
          connectionId: connectionId.value,
          tableId: tableId || '',
        },
    connectionId: connectionId.value,
    workspaceId: workspaceId.value,
    schemaId: currentSchemaId,
    metadata: {
      type: tabViewType,
      tableName: isOverview ? undefined : node.name,
      treeNodeId: node.id,
    },
  });

  await tabViewStore.selectTab(tabId);
};

/**
 * Handle FileTree click — resolve node and navigate
 */
const handleTreeClick = async (nodeId: string) => {
  const node = fileTreeData.value[nodeId];
  if (!node) return;

  await openErdTab(node);
};

watch(
  () => tabViewStore.activeTab,
  activeTab => {
    if (!activeTab) {
      fileTreeRef.value?.clearSelection();
      return;
    }

    if (fileTreeRef.value?.isMouseInside) return;

    if (activeTab.type === TabViewType.AllERD) {
      if (fileTreeData.value[ERDFolderType.Root]) {
        fileTreeRef.value?.focusItem(ERDFolderType.Root);
      }
      return;
    }

    if (activeTab.type === TabViewType.DetailERD) {
      if (typeof activeTab.metadata?.treeNodeId === 'string') {
        fileTreeRef.value?.focusItem(activeTab.metadata.treeNodeId);
        return;
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
      title="ERD Diagram"
      :show-connection="true"
      :show-schema="true"
      :workspace-id="workspaceId"
      :show-search="true"
      search-placeholder="Search in diagram..."
    >
      <template #actions>
        <Tooltip>
          <TooltipTrigger as-child>
            <Button size="iconSm" variant="ghost" @click="onToggleCollapse">
              <Icon
                :name="
                  isTreeCollapsed
                    ? 'hugeicons:unfold-more'
                    : 'hugeicons:unfold-less'
                "
                class="size-4! min-w-4 text-muted-foreground"
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {{ isTreeCollapsed ? 'Expand All' : 'Collapse All' }}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger as-child>
            <Button size="iconSm" variant="ghost" @click="onRefreshSchema">
              <Icon
                name="hugeicons:redo"
                :class="[
                  'size-4! min-w-4 text-muted-foreground',
                  isRefreshing && 'animate-spin',
                ]"
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent> Refresh ERD Data </TooltipContent>
        </Tooltip>
      </template>
    </ManagementSidebarHeader>

    <!-- TODO: check flow when change connection  -->
    <!-- TODO: check flow when change schema  -->

    <div
      v-if="Object.keys(fileTreeData).length === 0"
      class="flex flex-col items-center h-full justify-center"
    >
      No data!
    </div>

    <FileTree
      ref="fileTreeRef"
      :init-expanded-ids="defaultExpandedKeys"
      :storage-key="`${connectionId}-erd-tree`"
      :initial-data="fileTreeData"
      :allow-drag-and-drop="false"
      @click="handleTreeClick"
    />
  </div>
</template>
