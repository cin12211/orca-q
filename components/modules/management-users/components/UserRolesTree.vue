<script setup lang="ts">
import {
  TreeManager,
  type FlattenedTreeFileSystemItem,
  type TreeFileSystemItem,
} from '~/components/base/Tree';
import TreeFolder from '~/components/base/Tree/TreeFolder.vue';
import BaseContextMenu from '~/components/base/context-menu/BaseContextMenu.vue';
import {
  ContextMenuItemType,
  type ContextMenuItem,
} from '~/components/base/context-menu/menuContext.type';
import {
  useTabViewsStore,
  TabViewType,
} from '~/shared/stores/useTabViewsStore';
import { useWSStateStore } from '~/shared/stores/useWSStateStore';
import type { DatabaseRole } from '~/shared/types';
import { RoleCategory } from '~/shared/types';
import DeleteUserDialog from './DeleteUserDialog.vue';

interface Props {
  roles: DatabaseRole[];
  loading?: boolean;
  selectedRoleName?: string | null;
  onCreateUser?: () => void;
  canCreateUser?: boolean;
  createUserDisabledReason?: string;
  onDeleteUser?: (role: DatabaseRole) => Promise<any>;
  onRefresh?: () => void;
}

const props = defineProps<Props>();

const tabViewStore = useTabViewsStore();
const wsStateStore = useWSStateStore();
const { workspaceId, connectionId, schemaId } = toRefs(wsStateStore);

// Expanded state for tree folders
const expandedState = ref<string[]>([
  RoleCategory.Superuser,
  RoleCategory.User,
  RoleCategory.Role,
]);

// Selected item for context menu
const selectedItem = ref<{
  type: 'category' | 'role';
  category?: RoleCategory;
  role?: DatabaseRole;
} | null>(null);

// Delete dialog state
const deleteDialogOpen = ref(false);
const deleteDialogRole = ref<DatabaseRole | null>(null);
const isDeleting = ref(false);

/**
 * Transform roles into TreeFileSystemItem format
 */
const items = computed<TreeFileSystemItem[]>(() => {
  const superusers: DatabaseRole[] = [];
  const users: DatabaseRole[] = [];
  const roles: DatabaseRole[] = [];

  for (const role of props.roles) {
    if (role.isSuperuser) {
      superusers.push(role);
    } else if (role.canLogin) {
      users.push(role);
    } else {
      roles.push(role);
    }
  }

  const createRoleItem = (role: DatabaseRole): TreeFileSystemItem => ({
    id: role.roleName,
    title: role.roleName,
    path: role.roleName,
    icon: role.canLogin ? 'hugeicons:user-circle' : 'hugeicons:user-lock-01',
    iconClass: role.isSuperuser
      ? 'text-yellow-500'
      : role.canLogin
        ? 'text-blue-400'
        : 'text-purple-400',
    isFolder: false,
    tabViewType: TabViewType.UserPermissions,
    // Store role data for context menu
    ...({ roleData: role } as any),
  });

  const treeItems: TreeFileSystemItem[] = [];

  if (superusers.length > 0) {
    treeItems.push({
      id: RoleCategory.Superuser,
      title: `Superusers (${superusers.length})`,
      path: RoleCategory.Superuser,
      icon: 'hugeicons:crown',
      closeIcon: 'hugeicons:crown',
      iconClass: 'text-yellow-500',
      isFolder: true,
      children: superusers.map(createRoleItem),
    });
  }

  if (users.length > 0) {
    treeItems.push({
      id: RoleCategory.User,
      title: `Users (${users.length})`,
      path: RoleCategory.User,
      icon: 'hugeicons:user',
      closeIcon: 'hugeicons:user',
      iconClass: 'text-blue-500',
      isFolder: true,
      children: users.map(createRoleItem),
    });
  }

  if (roles.length > 0) {
    treeItems.push({
      id: RoleCategory.Role,
      title: `Roles (${roles.length})`,
      path: RoleCategory.Role,
      icon: 'hugeicons:user-group',
      closeIcon: 'hugeicons:user-group',
      iconClass: 'text-purple-500',
      isFolder: true,
      children: roles.map(createRoleItem),
    });
  }

  return treeItems;
});

/**
 * Find role by name from props
 */
const findRole = (roleName: string): DatabaseRole | undefined => {
  return props.roles.find(r => r.roleName === roleName);
};

/**
 * Handle right-click on tree item
 */
const onRightClickItem = (e: MouseEvent, item: FlattenedTreeFileSystemItem) => {
  e.preventDefault();

  const value = item.value as TreeFileSystemItem;

  if (value.isFolder) {
    // Category folder
    selectedItem.value = {
      type: 'category',
      category: value.id as RoleCategory,
    };
  } else {
    // Role item
    const role = (value as any).roleData as DatabaseRole | undefined;
    if (role) {
      selectedItem.value = { type: 'role', role };
    } else {
      // Fallback: find role by name
      const foundRole = findRole(value.id);
      if (foundRole) {
        selectedItem.value = { type: 'role', role: foundRole };
      }
    }
  }
};

/**
 * Handle click on tree item - open permissions tab
 */
const onClickTreeItem = async (
  _: MouseEvent,
  item: FlattenedTreeFileSystemItem
) => {
  const value = item.value as TreeFileSystemItem;

  // Don't open tab for folders
  if (value.isFolder) return;

  if (!workspaceId.value || !connectionId.value) return;

  const role = (value as any).roleData as DatabaseRole | undefined;
  const roleName = role?.roleName || value.id;

  const tabId = `user-permissions-${roleName}`;

  await tabViewStore.openTab({
    workspaceId: workspaceId.value,
    connectionId: connectionId.value,
    schemaId: schemaId.value || '',
    id: tabId,
    name: `${roleName} Permissions`,
    icon: role?.isSuperuser
      ? 'hugeicons:crown'
      : role?.canLogin
        ? 'hugeicons:user-circle'
        : 'hugeicons:user-lock-01',
    iconClass: role?.isSuperuser
      ? 'text-yellow-500'
      : role?.canLogin
        ? 'text-blue-400'
        : 'text-purple-400',
    type: TabViewType.UserPermissions,
    routeName: 'workspaceId-connectionId-quick-query-user-permissions-roleName',
    routeParams: {
      workspaceId: workspaceId.value,
      connectionId: connectionId.value,
      roleName: roleName,
    },
  });

  await tabViewStore.selectTab(tabId);
};

/**
 * Build context menu items based on selected item
 */
const contextMenuItems = computed<ContextMenuItem[]>(() => {
  const menuItems: ContextMenuItem[] = [];

  if (!selectedItem.value) {
    // Default menu when no specific item selected
    menuItems.push({
      title: 'Create User',
      icon: 'lucide:user-plus',
      type: ContextMenuItemType.ACTION,
      select: () => props.onCreateUser?.(),
      disabled: props.canCreateUser === false,
    });
    menuItems.push({ type: ContextMenuItemType.SEPARATOR });
    menuItems.push({
      title: 'Refresh',
      icon: 'lucide:refresh-cw',
      type: ContextMenuItemType.ACTION,
      select: () => props.onRefresh?.(),
    });
    return menuItems;
  }

  // Category-level actions
  if (selectedItem.value.type === 'category') {
    menuItems.push({
      title: 'Users & Roles',
      type: ContextMenuItemType.LABEL,
    });
    menuItems.push({
      title: 'Create User',
      icon: 'lucide:user-plus',
      type: ContextMenuItemType.ACTION,
      select: () => props.onCreateUser?.(),
      disabled: props.canCreateUser === false,
    });
    menuItems.push({ type: ContextMenuItemType.SEPARATOR });
    menuItems.push({
      title: 'Refresh',
      icon: 'lucide:refresh-cw',
      type: ContextMenuItemType.ACTION,
      select: () => props.onRefresh?.(),
    });
  }

  // Role-level actions
  if (selectedItem.value.type === 'role' && selectedItem.value.role) {
    const role = selectedItem.value.role;

    menuItems.push({
      title: role.roleName,
      type: ContextMenuItemType.LABEL,
    });
    menuItems.push({
      title: 'View Permissions',
      icon: 'hugeicons:shield-01',
      type: ContextMenuItemType.ACTION,
      select: () => {
        // Simulate click to open tab
        const fakeEvent = new MouseEvent('click');
        const fakeItem = {
          value: {
            id: role.roleName,
            isFolder: false,
            roleData: role,
          },
        } as unknown as FlattenedTreeFileSystemItem;
        onClickTreeItem(fakeEvent, fakeItem);
      },
    });
    menuItems.push({ type: ContextMenuItemType.SEPARATOR });
    menuItems.push({
      title: 'Delete User',
      icon: 'lucide:trash-2',
      type: ContextMenuItemType.ACTION,
      select: () => {
        deleteDialogRole.value = role;
        deleteDialogOpen.value = true;
      },
      disabled: role.isSuperuser,
    });
    menuItems.push({ type: ContextMenuItemType.SEPARATOR });
    menuItems.push({
      title: 'Refresh',
      icon: 'lucide:refresh-cw',
      type: ContextMenuItemType.ACTION,
      select: () => props.onRefresh?.(),
    });
  }

  return menuItems;
});

/**
 * Clear context menu selection
 */
const clearSelection = () => {
  selectedItem.value = null;
};

/**
 * Confirm delete action
 */
const confirmDelete = async () => {
  if (!deleteDialogRole.value) return;

  isDeleting.value = true;
  try {
    await props.onDeleteUser?.(deleteDialogRole.value);
    deleteDialogOpen.value = false;
    deleteDialogRole.value = null;
  } finally {
    isDeleting.value = false;
  }
};
</script>

<template>
  <div class="flex flex-col gap-1 py-1 min-h-[200px]">
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-8">
      <Icon
        name="lucide:loader-2"
        class="size-6 animate-spin text-muted-foreground"
      />
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!roles.length"
      class="flex flex-col items-center justify-center py-8 text-muted-foreground"
    >
      <Icon name="hugeicons:user-group" class="size-12 mb-2 opacity-50" />
      <p class="text-sm">No roles found</p>
    </div>

    <!-- Roles Tree using TreeFolder -->
    <template v-else>
      <BaseContextMenu
        :context-menu-items="contextMenuItems"
        @on-clear-context-menu="clearSelection"
      >
        <TreeFolder
          v-model:explorerFiles="items"
          v-model:expandedState="expandedState"
          :isShowArrow="true"
          :isExpandedByArrow="true"
          :onRightClickItem="onRightClickItem"
          @clickTreeItem="onClickTreeItem"
        />
      </BaseContextMenu>
    </template>
  </div>

  <!-- Delete User Dialog -->
  <DeleteUserDialog
    v-model:open="deleteDialogOpen"
    :role="deleteDialogRole"
    :loading="isDeleting"
    @confirm="confirmDelete"
    @cancel="
      deleteDialogOpen = false;
      deleteDialogRole = null;
    "
  />
</template>
