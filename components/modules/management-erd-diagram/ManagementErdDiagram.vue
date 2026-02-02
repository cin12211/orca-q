<script setup lang="ts">
import { refDebounced, templateRef } from '@vueuse/core';
import { TreeManager, type TreeFileSystemItem } from '~/components/base/Tree';
import TreeFolder from '~/components/base/Tree/TreeFolder.vue';
import { useAppContext } from '~/shared/contexts/useAppContext';
import { useActivityBarStore } from '~/shared/stores';
import { TabViewType } from '~/shared/stores/useTabViewsStore';
import { DEFAULT_DEBOUNCE_INPUT } from '~/utils/constants';
import { buildTableNodeId } from '../erd-diagram/utils';
import { SchemaFolderType } from '../management-schemas/constants';
import ConnectionSelector from '../selectors/ConnectionSelector.vue';
import SchemaSelector from '../selectors/SchemaSelector.vue';

const { schemaStore, connectToConnection, wsStateStore } = useAppContext();
const { activeSchema } = toRefs(schemaStore);
const { connectionId, workspaceId } = toRefs(wsStateStore);

const isRefreshing = ref(false);

const searchInput = shallowRef('');
const debouncedSearch = refDebounced(searchInput, DEFAULT_DEBOUNCE_INPUT);

const items = computed(() => {
  const tables = activeSchema?.value?.tables || [];

  const treeItems: TreeFileSystemItem[] = [
    {
      title: 'All Tables',
      id: SchemaFolderType.Tables,
      icon: 'hugeicons:hierarchy-circle-02',
      closeIcon: 'hugeicons:hierarchy-circle-02',
      tabViewType: TabViewType.AllERD,
      path: SchemaFolderType.Tables,
      children: [
        ...tables.map(tableName => {
          const refId = buildTableNodeId({
            schemaName: activeSchema.value?.name || '',
            tableName,
          });

          return {
            title: tableName,
            id: refId,
            icon: 'hugeicons:hierarchy-circle-01',
            path: `${SchemaFolderType.Tables}/${refId}`,
            tabViewType: TabViewType.DetailERD,
            isFolder: false,
          };
        }),
      ],
      isFolder: true,
    },
  ];

  if (!debouncedSearch.value) {
    return treeItems;
  }

  const tree = new TreeManager([]);

  tree.tree = treeItems;

  return tree.searchByTitle(debouncedSearch.value);
});

const activityBarStore = useActivityBarStore();
const { erdExpandedState, onCollapsedErdTree } = toRefs(activityBarStore);

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

// Navigation functions
const onNavigateToErdDiagram = async (tableName: string) => {
  if (!workspaceId.value) {
    throw new Error('No workspace selected');
    return;
  }

  const tableId = buildTableNodeId({
    schemaName: activeSchema.value?.name || '',
    tableName,
  });

  navigateTo({
    name: 'workspaceId-connectionId-erd-tableId',
    params: {
      workspaceId: workspaceId.value || '',
      connectionId: connectionId.value || '',
      tableId,
    },
  });
};
const onNavigateToOverviewErdDiagram = async () => {
  if (!workspaceId.value) {
    throw new Error('No workspace selected');
  }

  navigateTo({
    name: 'workspaceId-connectionId-erd',
    params: {
      workspaceId: workspaceId.value || '',
      connectionId: connectionId.value || '',
    },
  });
};
</script>

<template>
  <div class="flex flex-col h-full w-full overflow-y-auto">
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
            <Button size="iconSm" variant="ghost" @click="onCollapsedErdTree">
              <Icon
                name="lucide:copy-minus"
                class="size-4! min-w-4 text-muted-foreground"
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent> Collapse All </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger as-child>
            <Button size="iconSm" variant="ghost" @click="onRefreshSchema">
              <Icon
                name="lucide:refresh-ccw"
                :class="[
                  'size-4! min-w-4 text-muted-foreground',
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
      v-if="!items.length"
      class="flex flex-col items-center h-full justify-center"
    >
      No data!
    </div>

    <TreeFolder
      v-model:explorerFiles="items"
      v-model:expandedState="erdExpandedState"
      :isShowArrow="true"
      :isExpandedByArrow="true"
      v-on:clickTreeItem="
        async (_, item) => {
          const tabViewType: TabViewType = (item.value as any).tabViewType;

          if (tabViewType === TabViewType.AllERD) {
            onNavigateToOverviewErdDiagram();
            return;
          }

          onNavigateToErdDiagram(item.value.title);
        }
      "
    />
    <!-- <template #extra-actions="{ item }">
        <div
          class="flex items-center"
          v-if="item.value.paths.includes('Tables')"
        >
          <Button
            size="iconSm"
            class="hover:bg-background/80!"
            variant="ghost"
            @click.stop="onNavigateToErdDiagram(item.value.title)"
          >
            <Icon
              name="raphael:diagram"
              class="size-4! min-w-4 text-muted-foreground"
            />
          </Button>
        </div>
      </template> -->
    <!-- </TreeFolder> -->
  </div>
</template>
