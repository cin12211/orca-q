<script setup lang="ts">
import BaseContextMenu from '~/components/base/context-menu/BaseContextMenu.vue';
import {
  ContextMenuItemType,
  type ContextMenuItem,
} from '~/components/base/context-menu/menuContext.type';
import FileTree from '~/components/base/tree-folder/FileTree.vue';
import type { FileNode } from '~/components/base/tree-folder/types';
import { useTabViewsStore, TabViewType } from '~/core/stores/useTabViewsStore';
import { useWSStateStore } from '~/core/stores/useWSStateStore';
import type { DatabaseRole } from '~/core/types';
import { RoleCategory } from '~/core/types';
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

const fileTreeRef = useTemplateRef<typeof FileTree | null>('fileTreeRef');

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
 * Transform roles into flat FileNode data for FileTree
 */
const fileTreeData = computed<Record<string, FileNode>>(() => {
  const nodes: Record<string, FileNode> = {};

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

  const addRoleNode = (role: DatabaseRole, parentId: string, depth: number) => {
    nodes[role.roleName] = {
      id: role.roleName,
      parentId,
      name: role.roleName,
      type: 'file',
      depth,
      iconClose: role.canLogin
        ? 'hugeicons:user-circle'
        : 'hugeicons:user-lock-01',
      iconClass: role.isSuperuser
        ? 'text-yellow-500'
        : role.canLogin
          ? 'text-blue-400'
          : 'text-purple-400',
      data: {
        tabViewType: TabViewType.UserPermissions,
        roleData: role,
      },
    };
  };

  if (superusers.length > 0) {
    nodes[RoleCategory.Superuser] = {
      id: RoleCategory.Superuser,
      parentId: null,
      name: `Superusers (${superusers.length})`,
      type: 'folder',
      depth: 0,
      iconOpen: 'hugeicons:crown',
      iconClose: 'hugeicons:crown',
      iconClass: 'text-yellow-500',
      children: superusers.map(r => r.roleName),
    };
    superusers.forEach(role => addRoleNode(role, RoleCategory.Superuser, 1));
  }

  if (users.length > 0) {
    nodes[RoleCategory.User] = {
      id: RoleCategory.User,
      parentId: null,
      name: `Users (${users.length})`,
      type: 'folder',
      depth: 0,
      iconOpen: 'hugeicons:user',
      iconClose: 'hugeicons:user',
      iconClass: 'text-blue-500',
      children: users.map(r => r.roleName),
    };
    users.forEach(role => addRoleNode(role, RoleCategory.User, 1));
  }

  if (roles.length > 0) {
    nodes[RoleCategory.Role] = {
      id: RoleCategory.Role,
      parentId: null,
      name: `Roles (${roles.length})`,
      type: 'folder',
      depth: 0,
      iconOpen: 'hugeicons:user-group',
      iconClose: 'hugeicons:user-group',
      iconClass: 'text-purple-500',
      children: roles.map(r => r.roleName),
    };
    roles.forEach(role => addRoleNode(role, RoleCategory.Role, 1));
  }

  return nodes;
});

/**
 * Find role by name from props
 */
const findRole = (roleName: string): DatabaseRole | undefined => {
  return props.roles.find(r => r.roleName === roleName);
};

/**
 * Handle right-click on tree item via FileTree contextmenu emit
 */
const handleTreeContextMenu = (nodeId: string, event: MouseEvent) => {
  // event.preventDefault();

  const node = fileTreeData.value[nodeId];
  if (!node) return;

  if (node.type === 'folder') {
    // Category folder
    selectedItem.value = {
      type: 'category',
      category: node.id as RoleCategory,
    };
  } else {
    // Role item
    const role = node.data?.roleData as DatabaseRole | undefined;
    if (role) {
      selectedItem.value = { type: 'role', role };
    } else {
      // Fallback: find role by name
      const foundRole = findRole(node.id);
      if (foundRole) {
        selectedItem.value = { type: 'role', role: foundRole };
      }
    }
  }
};

/**
 * Handle click on tree item - open permissions tab
 */
const handleTreeClick = async (nodeId: string) => {
  const node = fileTreeData.value[nodeId];
  if (!node) return;

  // Don't open tab for folders
  if (node.type === 'folder') return;

  if (!workspaceId.value || !connectionId.value) return;

  const role = node.data?.roleData as DatabaseRole | undefined;
  const roleName = role?.roleName || node.id;

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
        handleTreeClick(role.roleName);
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

watch(
  () => tabViewStore.activeTab,
  activeTab => {
    if (activeTab?.type === TabViewType.UserPermissions) {
      const roleName = activeTab.routeParams?.roleName;

      if (typeof roleName === 'string' && !fileTreeRef.value?.isMouseInside) {
        fileTreeRef.value?.focusItem(roleName);
      }
    }
  },
  { flush: 'post', immediate: true }
);
</script>

<template>
  <div class="flex flex-col gap-1 py-1 h-full">
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

    <!-- Roles Tree using FileTree -->
    <template v-else>
      <BaseContextMenu
        :context-menu-items="contextMenuItems"
        @on-clear-context-menu="clearSelection"
      >
        <div class="h-full">
          <FileTree
            ref="fileTreeRef"
            :initial-data="fileTreeData"
            :allow-drag-and-drop="false"
            :delay-focus="0"
            @click="handleTreeClick"
            @contextmenu="handleTreeContextMenu"
          />
        </div>
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
