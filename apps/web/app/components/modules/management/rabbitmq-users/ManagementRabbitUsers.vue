<script setup lang="ts">
import { refDebounced } from '@vueuse/core';
import BaseContextMenu from '~/components/base/context-menu/BaseContextMenu.vue';
import {
  ContextMenuItemType,
  type ContextMenuItem,
} from '~/components/base/context-menu/menuContext.type';
import FileTree from '~/components/base/tree-folder/FileTree.vue';
import type { FileNode } from '~/components/base/tree-folder/types';
import {
  getRabbitUserAppearance,
  getRabbitUserGroupId,
  RABBIT_USER_GROUPS,
  RabbitCreateUserDialog,
  RabbitDeleteUserDialog,
  rabbitmqService,
  useRabbitTabs,
  useRabbitUserActions,
  useRabbitUsersChanged,
} from '~/components/modules/rabbitmq-workspace';
import {
  buildBrokerTree,
  formatNumber,
  useBrokerRequest,
} from '~/components/modules/shared/message-broker';
import { useWorkspaceConnectionRoute } from '~/core/composables/useWorkspaceConnectionRoute';
import { DEFAULT_DEBOUNCE_INPUT } from '~/core/constants';
import { copyToClipboard } from '~/core/helpers/copy-data/operations';
import { useManagementConnectionStore } from '~/core/stores';
import type { RabbitUserSummary } from '~/core/types/rabbitmq.types';
import { ManagementSidebarHeader } from '../shared';

interface RabbitUserTreeData {
  groupCount?: number;
  tags?: string[];
  isCurrentUser?: boolean;
  appearance?: ReturnType<typeof getRabbitUserAppearance>;
}

const folderId = (groupId: string) => `rabbit-users-${groupId}`;
const ALL_FOLDER_IDS = RABBIT_USER_GROUPS.map(group => folderId(group.id));

const connectionStore = useManagementConnectionStore();
const { workspaceId } = useWorkspaceConnectionRoute();
const { openUser } = useRabbitTabs();
const connection = computed(() => connectionStore.selectedConnection);
const searchQuery = ref('');
const fileTreeRef = useTemplateRef<typeof FileTree | null>('fileTreeRef');
const isTreeCollapsed = ref(false);
const debouncedSearch = refDebounced(searchQuery, DEFAULT_DEBOUNCE_INPUT);

const snapshot = useBrokerRequest(async () =>
  connection.value ? rabbitmqService.users(connection.value) : null
);

const vhosts = useBrokerRequest(async () =>
  connection.value ? rabbitmqService.vhosts(connection.value) : []
);
const isCreateOpen = ref(false);
const { isSaving, deleteUser } = useRabbitUserActions(
  () => connection.value ?? null
);
const usersChanged = useRabbitUsersChanged();
/** Tree node the context menu was opened on; null for the background. */
const contextNodeId = ref<string | null>(null);
const deletingUser = ref<string | null>(null);

const currentUser = computed(() => snapshot.data.value?.currentUser ?? null);
const canCreateUsers = computed(
  () =>
    Boolean(currentUser.value?.tags.includes('administrator')) &&
    !snapshot.data.value?.unavailableReason
);
const createUserDisabledReason = computed(() =>
  canCreateUsers.value
    ? 'Add user'
    : 'Adding users needs the "administrator" tag on this RabbitMQ user'
);

const toTreeItem = (user: RabbitUserSummary) => ({
  id: `user:${user.name}`,
  name: user.name,
  ...getRabbitUserAppearance(user),
  data: {
    tags: user.tags,
    isCurrentUser: user.name === currentUser.value?.name,
    appearance: getRabbitUserAppearance(user),
  },
});

/** One folder per RabbitMQ user tag, most privileged first. */
const treeData = computed(() => {
  const users = snapshot.data.value?.users ?? [];

  return buildBrokerTree<RabbitUserTreeData>(
    RABBIT_USER_GROUPS.map(group => ({
      id: folderId(group.id),
      label: group.label,
      icon: group.icon,
      iconClass: group.iconClass,
      itemIcon: 'hugeicons:user-circle',
      isHiddenWhenEmpty: true,
      items: users
        .filter(user => getRabbitUserGroupId(user.tags) === group.id)
        .map(toTreeItem),
    })),
    debouncedSearch.value
  );
});
const isInitialLoading = computed(
  () => snapshot.isLoading.value && !snapshot.data.value
);

const nodeData = (node: FileNode) => node.data as RabbitUserTreeData;

const openCreateDialog = async () => {
  if (!vhosts.data.value) await vhosts.load();
  isCreateOpen.value = true;
};

const onUserCreated = async (userName: string) => {
  await snapshot.load();
  const user = snapshot.data.value?.users.find(item => item.name === userName);
  void openUser(userName, user ? getRabbitUserAppearance(user) : undefined);
};

const handleTreeClick = (nodeId: string) => {
  const node = treeData.value[nodeId];
  if (node?.type !== 'file') return;

  void openUser(node.name, nodeData(node as FileNode).appearance);
};

const contextMenuItems = computed<ContextMenuItem[]>(() => {
  const node = contextNodeId.value ? treeData.value[contextNodeId.value] : null;
  const refreshItem: ContextMenuItem = {
    title: 'Refresh',
    icon: 'hugeicons:redo',
    type: ContextMenuItemType.ACTION,
    select: () => snapshot.load(),
  };
  const addItem: ContextMenuItem = {
    title: 'Add user',
    icon: 'hugeicons:user-add-01',
    type: ContextMenuItemType.ACTION,
    disabled: !canCreateUsers.value,
    select: openCreateDialog,
  };

  if (node?.type !== 'file') {
    return [addItem, { type: ContextMenuItemType.SEPARATOR }, refreshItem];
  }

  const userName = node.name;
  const isSelf = userName === currentUser.value?.name;

  return [
    { title: userName, type: ContextMenuItemType.LABEL },
    {
      title: 'Open',
      icon: 'hugeicons:user-circle',
      type: ContextMenuItemType.ACTION,
      select: () => handleTreeClick(node.id),
    },
    {
      title: 'Copy name',
      icon: 'hugeicons:copy-01',
      type: ContextMenuItemType.ACTION,
      select: () => copyToClipboard(userName),
    },
    { type: ContextMenuItemType.SEPARATOR },
    addItem,
    {
      title: isSelf ? 'Delete user (connected as this user)' : 'Delete user',
      icon: 'hugeicons:delete-02',
      type: ContextMenuItemType.ACTION,
      disabled: !canCreateUsers.value || isSelf,
      select: () => {
        deletingUser.value = userName;
      },
    },
    { type: ContextMenuItemType.SEPARATOR },
    refreshItem,
  ];
});

const confirmDelete = async () => {
  if (deletingUser.value && (await deleteUser(deletingUser.value))) {
    deletingUser.value = null;
  }
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

usersChanged.on(event => {
  if (event.connectionId === connection.value?.id) void snapshot.load();
});

watch(
  () => connection.value?.id,
  () => snapshot.load(),
  { immediate: true }
);
</script>

<template>
  <div class="flex flex-col h-full w-full overflow-hidden relative">
    <LoadingOverlay :visible="isInitialLoading" />

    <ManagementSidebarHeader
      v-model:search="searchQuery"
      title="Users & Permissions"
      :show-connection="true"
      :workspace-id="workspaceId"
      :show-search="true"
      search-placeholder="Filter users..."
    >
      <template #actions>
        <Tooltip>
          <TooltipTrigger as-child>
            <span>
              <Button
                size="iconSm"
                variant="ghost"
                :disabled="!canCreateUsers"
                @click="openCreateDialog"
              >
                <Icon name="hugeicons:user-add-01" class="size-4! min-w-4" />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{{ createUserDisabledReason }}</TooltipContent>
        </Tooltip>

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
            <Button size="iconSm" variant="ghost" @click="snapshot.load()">
              <Icon
                name="hugeicons:redo"
                :class="[
                  'size-4! min-w-4',
                  snapshot.isLoading.value && 'animate-spin',
                ]"
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Refresh Users</TooltipContent>
        </Tooltip>
      </template>
    </ManagementSidebarHeader>

    <p
      v-if="currentUser"
      class="px-2 pt-2 text-xs text-muted-foreground truncate"
    >
      Connected as <span class="text-foreground">{{ currentUser.name }}</span>
      <template v-if="currentUser.tags.length">
        ({{ currentUser.tags.join(', ') }})
      </template>
    </p>

    <BaseNotice
      v-if="snapshot.error.value"
      variant="destructive"
      class="mx-2 mt-2"
    >
      {{ snapshot.error.value }}
    </BaseNotice>
    <BaseNotice
      v-else-if="snapshot.data.value?.unavailableReason"
      variant="secondary"
      class="mx-2 mt-2"
    >
      {{ snapshot.data.value.unavailableReason }}
    </BaseNotice>

    <div
      v-if="!snapshot.data.value?.unavailableReason"
      class="h-full min-h-0 flex-1 overflow-hidden"
    >
      <BaseContextMenu
        :context-menu-items="contextMenuItems"
        @on-clear-context-menu="contextNodeId = null"
      >
        <div class="h-full">
          <FileTree
            ref="fileTreeRef"
            :init-expanded-ids="ALL_FOLDER_IDS"
            :initial-data="treeData as unknown as Record<string, FileNode>"
            :storage-key="`rabbitmq-users-tree-${connection?.id ?? ''}`"
            :search-query="debouncedSearch"
            :allow-drag-and-drop="false"
            :delay-focus="0"
            @click="handleTreeClick"
            @contextmenu="nodeId => (contextNodeId = nodeId)"
          >
            <template #meta="{ node }">
              <span
                v-if="node.type === 'folder'"
                class="text-xs text-muted-foreground"
              >
                {{ formatNumber(nodeData(node).groupCount) }}
              </span>
              <span
                v-else
                class="truncate text-xs text-muted-foreground"
                :title="nodeData(node).tags?.join(', ')"
              >
                <template v-if="nodeData(node).isCurrentUser">you · </template>
                {{ nodeData(node).tags?.join(', ') || 'no tags' }}
              </span>
            </template>
          </FileTree>
        </div>
      </BaseContextMenu>
    </div>

    <RabbitDeleteUserDialog
      :open="Boolean(deletingUser)"
      :user-name="deletingUser ?? ''"
      :is-saving="isSaving"
      @update:open="!$event && (deletingUser = null)"
      @confirm="confirmDelete"
    />

    <RabbitCreateUserDialog
      v-if="connection"
      v-model:open="isCreateOpen"
      :connection="connection"
      :vhosts="vhosts.data.value ?? []"
      @created="onUserCreated"
    />
  </div>
</template>
