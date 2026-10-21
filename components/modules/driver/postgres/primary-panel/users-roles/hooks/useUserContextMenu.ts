/**
 * Context Menu Hook for User Management
 * Provides context menu actions for the UserRolesTree component
 */
import {
  ContextMenuItemType,
  type ContextMenuItem,
} from '~/components/base/context-menu/menuContext.type';
import type { DatabaseRole, GrantRevokeResponse } from '~/core/types';
import { RoleCategory } from '~/core/types';

export interface UserContextMenuParams {
  onViewPermissions: (role: DatabaseRole) => void;
  onCreateUser: () => void;
  onDeleteUser: (role: DatabaseRole) => Promise<GrantRevokeResponse | null>;
  onRefresh: () => void;
}

export interface SelectedUserItem {
  type: 'category' | 'role';
  category?: RoleCategory;
  role?: DatabaseRole;
}

export const useUserContextMenu = (params: UserContextMenuParams) => {
  const selectedItem = ref<SelectedUserItem | null>(null);
  const deleteDialogOpen = ref(false);
  const deleteDialogRole = ref<DatabaseRole | null>(null);
  const isDeleting = ref(false);

  /**
   * Handle right-click on category or role item
   */
  const onRightClickItem = (item: SelectedUserItem) => {
    selectedItem.value = item;
  };

  /**
   * Clear selected item
   */
  const clearSelection = () => {
    selectedItem.value = null;
  };

  /**
   * Open delete confirmation dialog
   */
  const openDeleteDialog = (role: DatabaseRole) => {
    deleteDialogRole.value = role;
    deleteDialogOpen.value = true;
  };

  /**
   * Confirm delete action
   */
  const confirmDelete = async () => {
    if (!deleteDialogRole.value) return;

    isDeleting.value = true;
    try {
      await params.onDeleteUser(deleteDialogRole.value);
      deleteDialogOpen.value = false;
      deleteDialogRole.value = null;
    } finally {
      isDeleting.value = false;
    }
  };

  /**
   * Cancel delete action
   */
  const cancelDelete = () => {
    deleteDialogOpen.value = false;
    deleteDialogRole.value = null;
  };

  /**
   * Build context menu items based on selected item
   */
  const contextMenuItems = computed<ContextMenuItem[]>(() => {
    const items: ContextMenuItem[] = [];

    if (!selectedItem.value) {
      return items;
    }

    // Category-level actions
    if (selectedItem.value.type === 'category') {
      items.push({
        title: 'Users & Roles',
        type: ContextMenuItemType.LABEL,
      });

      items.push({
        title: 'Create User',
        icon: 'lucide:user-plus',
        type: ContextMenuItemType.ACTION,
        select: () => params.onCreateUser(),
      });

      items.push({
        type: ContextMenuItemType.SEPARATOR,
      });

      items.push({
        title: 'Refresh',
        icon: 'lucide:refresh-cw',
        type: ContextMenuItemType.ACTION,
        select: () => params.onRefresh(),
      });
    }

    // Role-level actions
    if (selectedItem.value.type === 'role' && selectedItem.value.role) {
      const role = selectedItem.value.role;

      items.push({
        title: role.roleName,
        type: ContextMenuItemType.LABEL,
      });

      items.push({
        title: 'View Permissions',
        icon: 'hugeicons:shield-01',
        type: ContextMenuItemType.ACTION,
        select: () => params.onViewPermissions(role),
      });

      items.push({
        type: ContextMenuItemType.SEPARATOR,
      });

      items.push({
        title: 'Delete User',
        icon: 'lucide:trash-2',
        type: ContextMenuItemType.ACTION,
        select: () => openDeleteDialog(role),
        // Disable delete for superusers
        disabled: role.isSuperuser,
      });

      items.push({
        type: ContextMenuItemType.SEPARATOR,
      });

      items.push({
        title: 'Refresh',
        icon: 'lucide:refresh-cw',
        type: ContextMenuItemType.ACTION,
        select: () => params.onRefresh(),
      });
    }

    return items;
  });

  return {
    selectedItem,
    contextMenuItems,
    onRightClickItem,
    clearSelection,
    deleteDialogOpen,
    deleteDialogRole,
    isDeleting,
    confirmDelete,
    cancelDelete,
  };
};
