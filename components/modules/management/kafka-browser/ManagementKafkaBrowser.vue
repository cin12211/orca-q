<script setup lang="ts">
import { refDebounced } from '@vueuse/core';
import FileTree from '~/components/base/tree-folder/FileTree.vue';
import type { FileNode } from '~/components/base/tree-folder/types';
import {
  kafkaService,
  useKafkaTabs,
} from '~/components/modules/kafka-workspace';
import {
  buildBrokerTree,
  formatNumber,
  useBrokerRequest,
} from '~/components/modules/shared/message-broker';
import { useTabManagement } from '~/core/composables/useTabManagement';
import { useWorkspaceConnectionRoute } from '~/core/composables/useWorkspaceConnectionRoute';
import { DEFAULT_DEBOUNCE_INPUT } from '~/core/constants';
import { useManagementConnectionStore } from '~/core/stores';
import { TabViewType } from '~/core/types/entities/tab-view.entity';
import { ManagementSidebarHeader } from '../shared';

interface KafkaTreeData {
  groupCount?: number;
  kind?: 'topic' | 'group';
  count?: number;
  health?: 'offline' | 'under-replicated' | null;
}

const TOPICS_FOLDER_ID = 'kafka-topics';
const GROUPS_FOLDER_ID = 'kafka-groups';

const connectionStore = useManagementConnectionStore();
const { workspaceId } = useWorkspaceConnectionRoute();
const { openTopic, openGroup } = useKafkaTabs();
const connection = computed(() => connectionStore.selectedConnection);
const searchQuery = ref('');
const debouncedSearch = refDebounced(searchQuery, DEFAULT_DEBOUNCE_INPUT);
const fileTreeRef = useTemplateRef<typeof FileTree | null>('fileTreeRef');
const isTreeCollapsed = ref(false);
const { openBrokerTab } = useTabManagement();

const topics = useBrokerRequest(async () =>
  connection.value ? kafkaService.topics(connection.value) : []
);
const groups = useBrokerRequest(async () =>
  connection.value ? kafkaService.groups(connection.value) : []
);

const treeData = computed(() =>
  buildBrokerTree<KafkaTreeData>(
    [
      {
        id: TOPICS_FOLDER_ID,
        label: 'Topics',
        icon: 'hugeicons:folder-01',
        itemIcon: 'hugeicons:message-multiple-01',
        items: (topics.data.value ?? []).map(topic => ({
          id: `topic:${topic.name}`,
          name: topic.name,
          data: {
            kind: 'topic' as const,
            count: topic.messageCount,
            health: topic.offlinePartitions
              ? ('offline' as const)
              : topic.underReplicatedPartitions
                ? ('under-replicated' as const)
                : null,
          },
        })),
      },
      {
        id: GROUPS_FOLDER_ID,
        label: 'Consumer Groups',
        icon: 'hugeicons:folder-01',
        itemIcon: 'hugeicons:user-multiple',
        items: (groups.data.value ?? []).map(group => ({
          id: `group:${group.groupId}`,
          name: group.groupId,
          data: { kind: 'group' as const, count: group.totalLag },
        })),
      },
    ],
    debouncedSearch.value
  )
);
const isInitialLoading = computed(
  () =>
    (topics.isLoading.value && !topics.data.value) ||
    (groups.isLoading.value && !groups.data.value)
);
const error = computed(() => topics.error.value || groups.error.value);

const loadAll = () => Promise.all([topics.load(), groups.load()]);

const nodeData = (node: FileNode) => node.data as KafkaTreeData;

const openNode = (node: FileNode) => {
  if (nodeData(node).kind === 'topic') {
    void openTopic(node.name);
    return;
  }

  void openGroup(node.name);
};

const handleTreeClick = (nodeId: string) => {
  const node = treeData.value[nodeId];
  if (node?.type === 'file') openNode(node as FileNode);
};

/** Same tab ids as the Kafka Tools sidebar, so both open one tab. */
const openListTab = (folderId: string) => {
  const isTopics = folderId === TOPICS_FOLDER_ID;
  const connectionId = connection.value?.id ?? 'broker';

  void openBrokerTab({
    id: `${isTopics ? 'kafka-topics' : 'kafka-groups'}-${connectionId}`,
    name: isTopics ? 'Topics' : 'Consumer Groups',
    type: isTopics
      ? TabViewType.KafkaTopicList
      : TabViewType.KafkaConsumerGroupList,
    icon: isTopics ? 'hugeicons:list-view' : 'hugeicons:user-multiple',
  });
};

const onToggleCollapse = () => {
  if (!fileTreeRef.value) return;

  if (isTreeCollapsed.value) {
    fileTreeRef.value.expandAll();
  } else {
    fileTreeRef.value.collapseAll();
  }

  isTreeCollapsed.value = !isTreeCollapsed.value;
};

watch(() => connection.value?.id, loadAll, { immediate: true });
</script>

<template>
  <div class="flex flex-col h-full w-full overflow-hidden relative">
    <LoadingOverlay :visible="isInitialLoading" />

    <ManagementSidebarHeader
      v-model:search="searchQuery"
      title="Kafka"
      :show-connection="true"
      :workspace-id="workspaceId"
      :show-search="true"
      search-placeholder="Filter topics and groups..."
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
            <Button size="iconSm" variant="ghost" @click="loadAll()">
              <Icon
                name="hugeicons:redo"
                :class="[
                  'size-4! min-w-4',
                  topics.isLoading.value && 'animate-spin',
                ]"
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Refresh</TooltipContent>
        </Tooltip>
      </template>
    </ManagementSidebarHeader>

    <BaseNotice v-if="error" variant="destructive" class="mx-2 mt-2">
      {{ error }}
    </BaseNotice>

    <div class="h-full min-h-0 flex-1 overflow-hidden">
      <FileTree
        ref="fileTreeRef"
        :init-expanded-ids="[TOPICS_FOLDER_ID, GROUPS_FOLDER_ID]"
        :initial-data="treeData as unknown as Record<string, FileNode>"
        :storage-key="`kafka-tree-${connection?.id ?? ''}`"
        :search-query="debouncedSearch"
        :allow-drag-and-drop="false"
        :delay-focus="0"
        @click="handleTreeClick"
      >
        <template #meta="{ node }">
          <span
            v-if="node.type === 'folder'"
            class="text-xs text-muted-foreground"
          >
            {{ formatNumber(nodeData(node).groupCount) }}
          </span>
          <span
            v-else-if="nodeData(node).kind === 'topic'"
            class="flex items-center gap-1 text-xs text-muted-foreground"
          >
            <span
              v-if="nodeData(node).health"
              class="size-1.5 rounded-full"
              :class="
                nodeData(node).health === 'offline'
                  ? 'bg-rose-500'
                  : 'bg-amber-500'
              "
              :title="
                nodeData(node).health === 'offline'
                  ? 'Offline partitions'
                  : 'Under-replicated partitions'
              "
            />
            {{ formatNumber(nodeData(node).count) }}
          </span>
          <span
            v-else-if="nodeData(node).kind === 'group'"
            class="text-xs"
            :class="
              (nodeData(node).count ?? 0) > 0
                ? 'text-amber-500'
                : 'text-muted-foreground'
            "
            title="Total lag"
          >
            {{ formatNumber(nodeData(node).count) }}
          </span>
        </template>

        <template #actions="{ node }">
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button size="iconSm" variant="ghost" class="size-5!">
                <Icon
                  name="hugeicons:more-horizontal-circle-01"
                  class="size-3.5!"
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                v-if="node.type === 'folder'"
                @click="openListTab(node.id)"
              >
                <Icon name="hugeicons:list-view" class="size-4 mr-2" />
                {{
                  node.id === TOPICS_FOLDER_ID
                    ? 'View All Topics'
                    : 'View All Consumer Groups'
                }}
              </DropdownMenuItem>
              <DropdownMenuItem v-else @click="openNode(node)">
                <Icon name="hugeicons:link-circle-02" class="size-4 mr-2" />
                {{
                  nodeData(node).kind === 'topic'
                    ? 'View Topic'
                    : 'View Consumer Group'
                }}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </template>
      </FileTree>
    </div>
  </div>
</template>
