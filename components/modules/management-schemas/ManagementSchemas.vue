<script setup lang="ts">
import { refDebounced } from '@vueuse/core';
import type { RouteNameFromPath, RoutePathSchema } from '@typed-router/__paths';
import BaseContextMenu from '~/components/base/context-menu/BaseContextMenu.vue';
import FileTree from '~/components/base/tree-folder/FileTree.vue';
import { useSchemaTreeData } from '~/components/modules/management-schemas/hooks/useSchemaTreeData';
import { DEFAULT_DEBOUNCE_INPUT } from '~/core/constants';
import { useAppContext } from '~/core/contexts/useAppContext';
import { TabViewType } from '~/core/stores/useTabViewsStore';
import ConnectionSelector from '../selectors/ConnectionSelector.vue';
import SchemaSelector from '../selectors/SchemaSelector.vue';
import RenameDialog from './dialogs/RenameDialog.vue';
import SqlPreviewDialog from './dialogs/SqlPreviewDialog.vue';
import { useSchemaContextMenu } from './hooks/useSchemaContextMenu';

const { schemaStore, connectToConnection, wsStateStore, tabViewStore } =
  useAppContext();

const { activeSchema } = toRefs(schemaStore);
const { connectionId, schemaId, workspaceId } = toRefs(wsStateStore);

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

  let routeName: RouteNameFromPath<RoutePathSchema> | null = null;
  let routeParams: Record<string, any> | undefined;

  const tabId = `${node.name}-${schemaId.value}`;

  routeName = 'workspaceId-connectionId-quick-query-tabViewId';

  routeParams = {
    tabViewId: tabId,
  };

  const virtualTableId =
    tabViewType === TabViewType.ViewDetail
      ? String(itemValue?.id ?? node.id ?? '')
      : undefined;

  if (routeName) {
    const icon =
      itemValue?.icon ||
      node.iconOpen ||
      node.iconClose ||
      'hugeicons:grid-table';
    await tabViewStore.openTab({
      icon,
      iconClass: itemValue?.iconClass || node.iconClass,
      id: tabId,
      name: node.name,
      type: tabViewType,
      routeName,
      routeParams,
      connectionId: connectionId.value,
      schemaId: schemaId.value || '',
      workspaceId: workspaceId.value || '',
      metadata: {
        type: tabViewType,
        tableName: node.name,
        virtualTableId,
        functionId: String(itemValue?.id || ''),
        treeNodeId: node.id,
      },
    });

    await tabViewStore.selectTab(tabId);
  }
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
    <div class="relative w-full items-center px-2 pt-1 space-y-1">
      <div>
        <p
          class="text-sm font-medium text-muted-foreground leading-none block pb-1"
        >
          Connections
        </p>
        <ConnectionSelector class="w-full!" :workspaceId="workspaceId" />
      </div>

      <div>
        <p
          class="text-sm font-medium text-muted-foreground leading-none block pb-1"
        >
          Schemas
        </p>
        <SchemaSelector class="w-full!" />
      </div>
    </div>

    <div class="px-2 pt-2 flex items-center justify-between">
      <p class="text-sm font-medium text-muted-foreground leading-none">
        Schemas
      </p>

      <div class="flex items-center">
        <Tooltip>
          <TooltipTrigger as-child>
            <Button size="iconSm" variant="ghost" @click="onToggleCollapse">
              <Icon
                name="hugeicons:plus-minus"
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
                  'size-4! min-w-4 stroke-amber-400! text-muted-foreground',
                  isRefreshing && 'animate-spin',
                ]"
              />
            </Button>
          </TooltipTrigger>

          <TooltipContent> Refresh Schema </TooltipContent>
        </Tooltip>
      </div>
    </div>

    <div class="px-2 pb-1">
      <div class="relative w-full">
        <Input
          type="text"
          placeholder="Search in all tables or functions"
          class="pr-6 w-full h-8"
          v-model="searchInput"
        />

        <div
          v-if="searchInput"
          class="absolute right-2 top-1.5 w-4 cursor-pointer hover:bg-accent"
          @click="searchInput = ''"
        >
          <Icon name="lucide:x" class="stroke-3! text-muted-foreground" />
        </div>
      </div>
    </div>

    <!-- TODO: check flow when change connection  -->
    <!-- TODO: check flow when change schema  -->
    <div
      v-if="!hasTreeData"
      class="flex flex-col items-center h-full justify-center"
    >
      No data!
    </div>

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
