<script setup lang="ts">
import { refDebounced } from '@vueuse/core';
import FileTree from '~/components/base/tree-folder/FileTree.vue';
import type { FileNode } from '~/components/base/tree-folder/types';
import {
  isBuiltInRabbitExchange,
  RABBIT_ICON_CLASS,
  RABBIT_TAB_ICONS,
  rabbitmqService,
  useRabbitTabs,
} from '~/components/modules/rabbitmq-workspace';
import {
  buildBrokerTree,
  formatNumber,
  useBrokerRequest,
} from '~/components/modules/shared/message-broker';
import { useWorkspaceConnectionRoute } from '~/core/composables/useWorkspaceConnectionRoute';
import { DEFAULT_DEBOUNCE_INPUT } from '~/core/constants';
import { useManagementConnectionStore } from '~/core/stores';
import { ManagementSidebarHeader } from '../shared';

interface RabbitTreeData {
  groupCount?: number;
  kind?: 'queue' | 'exchange';
  ready?: number;
  isStuck?: boolean;
  exchangeType?: string;
}

const SIDEBAR_QUEUE_LIMIT = 500;
const QUEUES_FOLDER_ID = 'rabbit-queues';
const EXCHANGES_FOLDER_ID = 'rabbit-exchanges';

const connectionStore = useManagementConnectionStore();
const { workspaceId } = useWorkspaceConnectionRoute();
const { openQueue, openExchange, openQueueList } = useRabbitTabs();
const connection = computed(() => connectionStore.selectedConnection);

const vhost = ref('/');
const searchQuery = ref('');
const debouncedSearch = refDebounced(searchQuery, DEFAULT_DEBOUNCE_INPUT);
const fileTreeRef = useTemplateRef<typeof FileTree | null>('fileTreeRef');
const isTreeCollapsed = ref(false);

const vhosts = useBrokerRequest(async () =>
  connection.value ? rabbitmqService.vhosts(connection.value) : []
);
const queues = useBrokerRequest(async () =>
  connection.value
    ? rabbitmqService.queues(connection.value, {
        vhost: vhost.value,
        pageSize: SIDEBAR_QUEUE_LIMIT,
      })
    : null
);
const exchanges = useBrokerRequest(async () =>
  connection.value
    ? rabbitmqService.exchanges(connection.value, vhost.value)
    : []
);

const customExchanges = computed(() =>
  (exchanges.data.value ?? []).filter(
    exchange => !isBuiltInRabbitExchange(exchange.name)
  )
);
const isInitialLoading = computed(
  () =>
    (queues.isLoading.value && !queues.data.value) ||
    (exchanges.isLoading.value && !exchanges.data.value)
);

const treeData = computed(() =>
  buildBrokerTree<RabbitTreeData>(
    [
      {
        id: QUEUES_FOLDER_ID,
        label: 'Queues',
        count: queues.data.value?.totalCount,
        icon: 'hugeicons:folder-01',
        itemIcon: RABBIT_TAB_ICONS.queue,
        itemIconClass: RABBIT_ICON_CLASS,
        items: (queues.data.value?.items ?? []).map(queue => ({
          id: `queue:${queue.name}`,
          name: queue.name,
          data: {
            kind: 'queue' as const,
            ready: queue.messagesReady,
            isStuck: queue.messagesReady > 0 && queue.consumers === 0,
          },
        })),
      },
      {
        id: EXCHANGES_FOLDER_ID,
        label: 'Exchanges',
        icon: 'hugeicons:folder-01',
        itemIcon: RABBIT_TAB_ICONS.exchange,
        itemIconClass: RABBIT_ICON_CLASS,
        items: customExchanges.value.map(exchange => ({
          id: `exchange:${exchange.name}`,
          name: exchange.name,
          data: { kind: 'exchange' as const, exchangeType: exchange.type },
        })),
      },
    ],
    debouncedSearch.value
  )
);
const error = computed(
  () => vhosts.error.value || queues.error.value || exchanges.error.value
);

const loadAll = async () => {
  await Promise.all([vhosts.load(), queues.load(), exchanges.load()]);
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

const openNode = (node: FileNode) => {
  if (nodeData(node).kind === 'queue') {
    void openQueue(vhost.value, node.name);
    return;
  }

  void openExchange(vhost.value, node.name);
};

const nodeData = (node: FileNode) => node.data as RabbitTreeData;

const handleTreeClick = (nodeId: string) => {
  const node = treeData.value[nodeId];
  if (node?.type === 'file') openNode(node as FileNode);
};

watch(
  () => connection.value?.id,
  async () => {
    vhost.value = connection.value?.broker?.rabbitmq?.vhost || '/';
    await loadAll();
  },
  { immediate: true }
);
watch(vhost, () => loadAll());
</script>

<template>
  <div class="flex flex-col h-full w-full overflow-hidden relative">
    <LoadingOverlay :visible="isInitialLoading" />

    <ManagementSidebarHeader
      v-model:search="searchQuery"
      title="RabbitMQ"
      :show-connection="true"
      :workspace-id="workspaceId"
      :show-search="true"
      search-placeholder="Filter queues and exchanges..."
    >
      <template #details>
        <p class="text-sm leading-none block pb-1 pt-1">Virtual host</p>
        <Select v-model="vhost">
          <SelectTrigger size="sm" class="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="item in vhosts.data.value ?? [vhost]"
              :key="item"
              :value="item"
            >
              {{ item }}
            </SelectItem>
          </SelectContent>
        </Select>
      </template>
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
                  queues.isLoading.value && 'animate-spin',
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
        :init-expanded-ids="[QUEUES_FOLDER_ID, EXCHANGES_FOLDER_ID]"
        :initial-data="treeData as unknown as Record<string, FileNode>"
        :storage-key="`rabbitmq-tree-${connection?.id ?? ''}`"
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
            v-else-if="nodeData(node).kind === 'queue'"
            class="flex items-center gap-1 text-xs text-muted-foreground"
          >
            <span
              v-if="nodeData(node).isStuck"
              class="size-1.5 rounded-full bg-rose-500"
              title="Messages waiting, no consumer"
            />
            {{ formatNumber(nodeData(node).ready) }}
          </span>
          <span
            v-else-if="nodeData(node).kind === 'exchange'"
            class="text-xs text-muted-foreground"
          >
            {{ nodeData(node).exchangeType }}
          </span>
        </template>

        <template #actions="{ node }">
          <DropdownMenu
            v-if="node.type === 'file' || node.id === QUEUES_FOLDER_ID"
          >
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
                v-if="node.id === QUEUES_FOLDER_ID"
                @click="openQueueList(vhost)"
              >
                <Icon name="hugeicons:list-view" class="size-4 mr-2" />
                View All Queues
              </DropdownMenuItem>
              <DropdownMenuItem
                v-else-if="node.type === 'file'"
                @click="openNode(node)"
              >
                <Icon name="hugeicons:link-circle-02" class="size-4 mr-2" />
                {{
                  nodeData(node).kind === 'queue'
                    ? 'View Queue'
                    : 'View Exchange'
                }}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </template>
      </FileTree>
    </div>
  </div>
</template>
