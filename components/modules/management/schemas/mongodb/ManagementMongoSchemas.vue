<script setup lang="ts">
import { refDebounced } from '@vueuse/core';
import { computed, ref, shallowRef, toRef, useTemplateRef } from 'vue';
import FileTree from '~/components/base/tree-folder/FileTree.vue';
import type { FileNode } from '~/components/base/tree-folder/types';
import { useMongoCollectionMutation } from '~/components/modules/quick-query/mongodb/hooks';
import { useTabManagement } from '~/core/composables/useTabManagement';
import { useWorkspaceConnectionRoute } from '~/core/composables/useWorkspaceConnectionRoute';
import { DEFAULT_DEBOUNCE_INPUT } from '~/core/constants';
import { formatBytes } from '~/core/helpers/bytes-formatter';
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';
import { TabViewType } from '~/core/types/entities/tab-view.entity';
import { ManagementSidebarHeader } from '../../shared';
import {
  CreateCollectionDialog,
  DeleteCollectionDialog,
  RenameCollectionDialog,
} from './dialogs';
import { useMongoSchemaTreeData } from './hooks';

const connectionStore = useManagementConnectionStore();
const { workspaceId } = useWorkspaceConnectionRoute();
const { openMongoDatabaseTab, openMongoCollectionTab } = useTabManagement();

const connection = toRef(connectionStore, 'selectedConnection');
const isRefreshing = ref(false);
const searchInput = shallowRef('');
const debouncedSearch = refDebounced(searchInput, DEFAULT_DEBOUNCE_INPUT);

const { fileTreeData, isLoading, defaultFolderOpenId, fetchDatabases } =
  useMongoSchemaTreeData(connection, debouncedSearch);

const { isMutating, createCollection, renameCollection, deleteCollection } =
  useMongoCollectionMutation({ connection });

const fileTreeRef = useTemplateRef<typeof FileTree | null>('fileTreeRef');
const isTreeCollapsed = ref(false);

const hasTreeData = computed(() => Object.keys(fileTreeData.value).length > 0);

const onRefresh = async () => {
  isRefreshing.value = true;
  await fetchDatabases();
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

const handleTreeClick = async (nodeId: string) => {
  const node = fileTreeData.value[nodeId];
  if (!node) return;

  const tabViewType = node.data?.tabViewType as TabViewType | undefined;

  if (tabViewType === TabViewType.MongoDatabaseOverview) {
    await openMongoDatabaseTab({ databaseName: node.name });
    return;
  }

  if (tabViewType === TabViewType.MongoCollectionDetail) {
    await openMongoCollectionTab({
      databaseName: node.parentId || '',
      collectionName: node.name,
    });
  }
};

const createDialogState = ref<{ open: boolean; databaseName: string }>({
  open: false,
  databaseName: '',
});
const renameDialogState = ref<{
  open: boolean;
  databaseName: string;
  currentName: string;
}>({ open: false, databaseName: '', currentName: '' });
const deleteDialogState = ref<{
  open: boolean;
  databaseName: string;
  collectionName: string;
}>({ open: false, databaseName: '', collectionName: '' });

const onRequestCreateCollection = (node: FileNode) => {
  createDialogState.value = { open: true, databaseName: node.name };
};

const onRequestRenameCollection = (node: FileNode) => {
  renameDialogState.value = {
    open: true,
    databaseName: node.parentId || '',
    currentName: node.name,
  };
};

const onRequestDeleteCollection = (node: FileNode) => {
  deleteDialogState.value = {
    open: true,
    databaseName: node.parentId || '',
    collectionName: node.name,
  };
};

const onConfirmCreateCollection = async (name: string) => {
  const succeeded = await createCollection(
    createDialogState.value.databaseName,
    name
  );
  if (succeeded) {
    createDialogState.value.open = false;
    await fetchDatabases();
  }
};

const onConfirmRenameCollection = async (newName: string) => {
  const succeeded = await renameCollection(
    renameDialogState.value.databaseName,
    renameDialogState.value.currentName,
    newName
  );
  if (succeeded) {
    renameDialogState.value.open = false;
    await fetchDatabases();
  }
};

const onConfirmDeleteCollection = async () => {
  const succeeded = await deleteCollection(
    deleteDialogState.value.databaseName,
    deleteDialogState.value.collectionName
  );
  if (succeeded) {
    deleteDialogState.value.open = false;
    await fetchDatabases();
  }
};
</script>

<template>
  <div class="flex flex-col h-full w-full overflow-hidden">
    <ManagementSidebarHeader
      v-model:search="searchInput"
      title="Schemas"
      :show-connection="true"
      :workspace-id="workspaceId"
      :show-search="true"
      search-placeholder="Search databases or collections"
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
            <Button size="iconSm" variant="ghost" @click="onRefresh">
              <Icon
                name="hugeicons:redo"
                :class="['size-4! min-w-4', isRefreshing && 'animate-spin']"
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent> Refresh </TooltipContent>
        </Tooltip>
      </template>
    </ManagementSidebarHeader>

    <BaseEmpty
      v-if="!hasTreeData && !isLoading"
      title="No data found"
      desc="There are no databases available for this connection."
    />

    <div class="h-full min-h-0 flex-1 overflow-hidden">
      <FileTree
        ref="fileTreeRef"
        :init-expanded-ids="[defaultFolderOpenId]"
        :initial-data="fileTreeData as unknown as Record<string, FileNode>"
        :storage-key="`${connectionStore.selectedConnection?.id}-mongo-schemas-tree`"
        :allow-drag-and-drop="false"
        :delay-focus="0"
        @click="handleTreeClick"
      >
        <template #meta="{ node }">
          <span
            v-if="
              node.type === 'folder' &&
              (node.data as any)?.totalSize !== undefined
            "
            class="text-xs text-muted-foreground"
          >
            {{ formatBytes(((node.data as any)?.totalSize as number) || 0) }}
          </span>
        </template>

        <template #actions="{ node }">
          <Tooltip v-if="node.type === 'folder'">
            <TooltipTrigger as-child>
              <Button
                size="iconSm"
                variant="ghost"
                class="size-5!"
                @click="onRequestCreateCollection(node)"
              >
                <Icon name="hugeicons:add-01" class="size-3.5!" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Create Collection</TooltipContent>
          </Tooltip>

          <DropdownMenu v-else>
            <DropdownMenuTrigger as-child>
              <Button size="iconSm" variant="ghost" class="size-5!">
                <Icon
                  name="hugeicons:more-horizontal-circle-01"
                  class="size-3.5!"
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem @click="onRequestRenameCollection(node)">
                <Icon name="hugeicons:edit-02" class="size-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                class="text-destructive"
                @click="onRequestDeleteCollection(node)"
              >
                <Icon name="hugeicons:delete-02" class="size-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </template>
      </FileTree>
    </div>

    <CreateCollectionDialog
      :open="createDialogState.open"
      :database-name="createDialogState.databaseName"
      :loading="isMutating"
      @update:open="createDialogState.open = $event"
      @confirm="onConfirmCreateCollection"
    />

    <RenameCollectionDialog
      :open="renameDialogState.open"
      :current-name="renameDialogState.currentName"
      :loading="isMutating"
      @update:open="renameDialogState.open = $event"
      @confirm="onConfirmRenameCollection"
    />

    <DeleteCollectionDialog
      :open="deleteDialogState.open"
      :collection-name="deleteDialogState.collectionName"
      :loading="isMutating"
      @update:open="deleteDialogState.open = $event"
      @confirm="onConfirmDeleteCollection"
      @cancel="deleteDialogState.open = false"
    />
  </div>
</template>
