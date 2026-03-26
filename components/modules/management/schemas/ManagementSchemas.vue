<script setup lang="ts">
import { refDebounced } from '@vueuse/core';
import { storeToRefs } from 'pinia';
import BaseContextMenu from '~/components/base/context-menu/BaseContextMenu.vue';
import FileTree from '~/components/base/tree-folder/FileTree.vue';
import { useSchemaTreeData } from '~/components/modules/management/schemas/hooks/useSchemaTreeData';
import { useTabManagement } from '~/core/composables/useTabManagement';
import { useWorkspaceConnectionRoute } from '~/core/composables/useWorkspaceConnectionRoute';
import { DEFAULT_DEBOUNCE_INPUT } from '~/core/constants';
import { useAppContext } from '~/core/contexts/useAppContext';
import { useSchemaStore, useWSStateStore } from '~/core/stores';
import { TabViewType, useTabViewsStore } from '~/core/stores/useTabViewsStore';
import SafeModeConfirmDialog from '../../quick-query/SafeModeConfirmDialog.vue';
import { ManagementSidebarHeader } from '../shared';
import RenameDialog from './dialogs/RenameDialog.vue';
import SqlPreviewDialog from './dialogs/SqlPreviewDialog.vue';
import { useSchemaContextMenu } from './hooks/useSchemaContextMenu';

const { connectToConnection } = useAppContext();
const schemaStore = useSchemaStore();
const wsStateStore = useWSStateStore();

const tabViewStore = useTabViewsStore();

const { openSchemaItemTab } = useTabManagement();

const { activeSchema } = storeToRefs(schemaStore);
const { connectionId, workspaceId } = useWorkspaceConnectionRoute();
const { schemaId } = storeToRefs(wsStateStore);

const isRefreshing = ref(false);

const fileTreeRef = useTemplateRef<typeof FileTree | null>('fileTreeRef');
const isTreeCollapsed = ref(false);

const searchInput = shallowRef('');
const debouncedSearch = refDebounced(searchInput, DEFAULT_DEBOUNCE_INPUT);

const { fileTreeData, defaultFolderOpenId } = useSchemaTreeData(
  activeSchema,
  debouncedSearch
);

const hasTreeData = computed(() => Object.keys(fileTreeData.value).length > 0);

const onRefreshSchema = async () => {
  if (!connectionId.value) {
    throw new Error('No connection selected');
    return;
  }

  isRefreshing.value = true;
  await connectToConnection({
    wsId: workspaceId.value,
    connId: connectionId.value,
    isRefresh: true,
  });

  isRefreshing.value = false;
};

const onToggleCollapse = () => {
  if (!fileTreeRef.value) return;

  if (isTreeCollapsed.value) {
    fileTreeRef.value.expandAll();
    isTreeCollapsed.value = false;
  } else {
    fileTreeRef.value.collapseAll();
    isTreeCollapsed.value = true;
  }
};

// Context menu setup
const schemaName = computed(() => activeSchema.value?.name || 'public');

const {
  selectedItem,
  contextMenuItems,
  safeModeDialogOpen,
  safeModeDialogSQL,
  safeModeDialogType,
  onSafeModeConfirm,
  onSafeModeCancel,
  renameDialogType,
  renameDialogOpen,
  renameDialogValue,

  onConfirmRename,
  sqlPreviewDialogOpen,
  sqlPreviewDialogSQL,
  sqlPreviewDialogTitle,
  onRightClickItem,
  isFetching,
  safeModeLoading,
} = useSchemaContextMenu({
  schemaName,
  activeSchema,
  onRefreshSchema,
});

const handleTreeClick = async (nodeId: string) => {
  const node = fileTreeData.value[nodeId];
  if (!node) return;

  const tabViewType: TabViewType | undefined = node.data?.tabViewType as
    | TabViewType
    | undefined;

  const itemValue = (node.data as any)?.itemValue as
    | {
        id?: string | number;
        icon?: string;
        iconClass?: string;
        tabViewType?: TabViewType;
        name?: string;
        title?: string;
      }
    | undefined;

  if (!schemaId.value || !tabViewType) {
    return;
  }

  await openSchemaItemTab({
    id: nodeId,
    name: node.name,
    type: tabViewType,
    icon: itemValue?.icon || node.iconOpen || node.iconClose,
    iconClass: itemValue?.iconClass || node.iconClass,
    itemValueId: itemValue?.id,
    treeNodeId: node.id,
  });
};

const handleTreeContextMenu = (nodeId: string, event: MouseEvent) => {
  const node = fileTreeData.value[nodeId];
  if (!node) return;

  const itemValue = (node.data as any)?.itemValue || {
    title: node.name,
    name: node.name,
    id: node.id,
    tabViewType: (node.data as any)?.tabViewType,
    icon: node.iconOpen || node.iconClose,
    iconClass: node.iconClass,
  };

  // Reuse existing context menu helper signature
  onRightClickItem(event, { value: itemValue } as any);
};

watch(
  () => tabViewStore.activeTab,
  activeTab => {
    if (!activeTab) {
      fileTreeRef.value?.clearSelection();
      return;
    }

    if (fileTreeRef.value?.isMouseInside) return;

    if (
      activeTab?.type === TabViewType.TableDetail ||
      activeTab?.type === TabViewType.TableOverview ||
      activeTab?.type === TabViewType.ViewDetail ||
      activeTab?.type === TabViewType.ViewOverview ||
      activeTab?.type === TabViewType.FunctionsDetail ||
      activeTab?.type === TabViewType.FunctionsOverview
    ) {
      const nodeId = activeTab.metadata?.treeNodeId;

      if (typeof nodeId === 'string') {
        fileTreeRef.value?.focusItem(nodeId);
      }
    }
  },
  { flush: 'post', immediate: true }
);
</script>

<template>
  <div class="flex flex-col h-full w-full overflow-y-auto relative">
    <ManagementSidebarHeader
      v-model:search="searchInput"
      title="Schemas"
      :show-connection="true"
      :show-schema="true"
      :workspace-id="workspaceId"
      :show-search="true"
      search-placeholder="Search in all tables or functions"
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
                class="size-4! min-w-4"
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
                :class="['size-4! min-w-4', isRefreshing && 'animate-spin']"
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent> Refresh Schema </TooltipContent>
        </Tooltip>
      </template>
    </ManagementSidebarHeader>

    <!-- TODO: check flow when change connection  -->
    <!-- TODO: check flow when change schema  -->
    <BaseEmpty
      v-if="!hasTreeData"
      title="No data found"
      desc="There is no schemas data available for this connection."
    />

    <!-- Context Menu Wrapper -->
    <BaseContextMenu
      :context-menu-items="contextMenuItems"
      @on-clear-context-menu="selectedItem = null"
    >
      <div class="h-full">
        <FileTree
          ref="fileTreeRef"
          :init-expanded-ids="[defaultFolderOpenId]"
          :initial-data="fileTreeData"
          :storage-key="`${connectionId}-schemas-tree`"
          :allow-drag-and-drop="false"
          :delay-focus="0"
          @click="handleTreeClick"
          @contextmenu="handleTreeContextMenu"
        />
      </div>
    </BaseContextMenu>

    <!-- Safe Mode Confirm Dialog -->
    <SafeModeConfirmDialog
      :loading="safeModeLoading"
      :open="safeModeDialogOpen"
      :sql="safeModeDialogSQL"
      :type="safeModeDialogType"
      @update:open="safeModeDialogOpen = $event"
      @confirm="onSafeModeConfirm"
      @cancel="onSafeModeCancel"
    />

    <!-- Rename Dialog -->
    <RenameDialog
      v-model:open="renameDialogOpen"
      :tabViewType="renameDialogType"
      :current-name="renameDialogValue"
      @confirm="onConfirmRename"
    />

    <!-- SQL Preview Dialog -->
    <SqlPreviewDialog
      :open="sqlPreviewDialogOpen"
      :sql="sqlPreviewDialogSQL"
      :title="sqlPreviewDialogTitle"
      :isLoading="isFetching"
      @update:open="sqlPreviewDialogOpen = $event"
    />
  </div>
</template>
