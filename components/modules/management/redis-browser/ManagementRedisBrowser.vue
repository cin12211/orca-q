<script setup lang="ts">
import { useRedisWorkspace } from '~/components/modules/redis-workspace/hooks/useRedisWorkspace';
import RedisDBSelector from '~/components/modules/selectors/RedisDBSelector.vue';
import { useTabManagement } from '~/core/composables/useTabManagement';
import { useWorkspaceConnectionRoute } from '~/core/composables/useWorkspaceConnectionRoute';
import { useManagementConnectionStore } from '~/core/stores';
import { RedisBrowserViewMode } from '~/core/stores/useRedisWorkspaceStore';
import { TabViewType } from '~/core/stores/useTabViewsStore';
import { ManagementSidebarHeader } from '../shared';
import RedisKeyTree from './components/RedisKeyTree.vue';

const connectionStore = useManagementConnectionStore();
const { openRedisTab } = useTabManagement();
const { workspaceId } = useWorkspaceConnectionRoute();
const connection = computed(() => connectionStore.selectedConnection);

const workspace = useRedisWorkspace({
  connection,
});
const { session, keys, databases, loadingKeys, selectedDatabaseIndex } =
  workspace;
const selectedKey = computed(() => session.value?.selectedKey ?? null);
const viewMode = computed({
  get: () => session.value?.viewMode ?? RedisBrowserViewMode.Tree,
  set: (value: RedisBrowserViewMode) => {
    if (!session.value) {
      return;
    }

    session.value.viewMode = value;
  },
});
const redisBrowserViewModes = [
  {
    value: RedisBrowserViewMode.Tree,
    icon: 'hugeicons:workflow-square-02',
    tooltip: 'Tree view',
  },
  {
    value: RedisBrowserViewMode.List,
    icon: 'hugeicons:list-view',
    tooltip: 'List view',
  },
] as const;
const searchQuery = ref('');
const treePanelRef = useTemplateRef<InstanceType<typeof RedisKeyTree> | null>(
  'treePanelRef'
);

const isTreeExpanded = computed(
  () => treePanelRef.value?.isExpandedAll ?? false
);

const updateDatabaseIndex = async (value: number) => {
  selectedDatabaseIndex.value = value;

  if (session.value) {
    session.value.selectedKey = null;
  }

  await workspace.refreshKeys();
};

const isRedisBrowserViewMode = (
  value: string | number
): value is RedisBrowserViewMode => {
  if (typeof value !== 'string') {
    return false;
  }

  return Object.values(RedisBrowserViewMode).includes(
    value as RedisBrowserViewMode
  );
};

const updateViewMode = (value: string | number) => {
  if (!isRedisBrowserViewMode(value)) {
    return;
  }

  viewMode.value = value;
};

const onToggleCollapse = () => {
  if (isTreeExpanded.value) {
    treePanelRef.value?.collapseAll();
    return;
  }

  treePanelRef.value?.expandAll();
};

const onRefreshKeys = async () => {
  await workspace.refreshKeys();
};

const openSelectedKey = async (key: string) => {
  await workspace.openKey(key);

  const connectionId = connection.value?.id || 'redis';
  await openRedisTab({
    id: `redis-browser-${connectionId}`,
    name: 'Redis Browser',
    type: TabViewType.RedisBrowser,
    metadata: {
      type: TabViewType.RedisBrowser,
      databaseIndex: workspace.selectedDatabaseIndex.value,
      keyPattern: workspace.keyPattern.value,
      selectedKey: key,
    },
  });
};
</script>

<template>
  <div class="flex flex-col h-full w-full overflow-hidden">
    <ManagementSidebarHeader
      title="Redis Browser"
      :show-connection="true"
      :workspace-id="workspaceId"
      :show-search="true"
      search-placeholder="Search keys..."
      v-model:search="searchQuery"
    >
      <template #details>
        <RedisDBSelector
          :databases="databases"
          :database-index="selectedDatabaseIndex"
          @update:database-index="updateDatabaseIndex"
        />
      </template>

      <template #actions>
        <div class="inline-flex items-center gap-1">
          <Tabs :model-value="viewMode" @update:model-value="updateViewMode">
            <TabsList class="w-full h-6">
              <Tooltip v-for="item in redisBrowserViewModes" :key="item.value">
                <TooltipTrigger as-child>
                  <TabsTrigger
                    :value="item.value"
                    :aria-label="item.tooltip"
                    class="h-5! px-1 font-medium text-xs cursor-pointer text-primary/80"
                  >
                    <Icon :name="item.icon" class="size-3!" />
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>{{ item.tooltip }}</TooltipContent>
              </Tooltip>
            </TabsList>
          </Tabs>
        </div>

        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              v-if="viewMode === RedisBrowserViewMode.Tree"
              size="iconSm"
              variant="ghost"
              @click="onToggleCollapse"
            >
              <Icon
                :name="
                  isTreeExpanded
                    ? 'hugeicons:unfold-less'
                    : 'hugeicons:unfold-more'
                "
                class="size-4! min-w-4"
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {{ isTreeExpanded ? 'Collapse All' : 'Expand All' }}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger as-child>
            <Button size="iconSm" variant="ghost" @click="onRefreshKeys">
              <Icon
                name="hugeicons:redo"
                :class="['size-4! min-w-4', loadingKeys && 'animate-spin']"
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Refresh Keys</TooltipContent>
        </Tooltip>
      </template>
    </ManagementSidebarHeader>

    <div class="flex min-h-0 flex-1 flex-col overflow-hidden px-2 pb-3">
      <RedisKeyTree
        ref="treePanelRef"
        :keys="keys"
        :selected-key="selectedKey"
        :loading="loadingKeys"
        :search-query="searchQuery"
        :view-mode="viewMode"
        @select="openSelectedKey"
      />
    </div>
  </div>
</template>
