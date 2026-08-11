<script setup lang="ts">
import { refDebounced } from '@vueuse/core';
import FileTree from '~/components/base/tree-folder/FileTree.vue';
import { useTabManagement } from '~/core/composables/useTabManagement';
import { useWorkspaceConnectionRoute } from '~/core/composables/useWorkspaceConnectionRoute';
import { DEFAULT_DEBOUNCE_INPUT } from '~/core/constants';
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';
import { TabViewType } from '~/core/types/entities/tab-view.entity';
import { ManagementSidebarHeader } from '../../shared';
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
        :initial-data="fileTreeData"
        :storage-key="`${connectionStore.selectedConnection?.id}-mongo-schemas-tree`"
        :allow-drag-and-drop="false"
        :delay-focus="0"
        @click="handleTreeClick"
      />
    </div>
  </div>
</template>
