import { getConnectionParams } from '@/core/helpers/connection-helper';
import type { Connection } from '~/core/stores';
import type {
  DatabaseRole,
  RoleInheritanceNode,
  RolePermissions,
} from '~/core/types';
import type { RoleInfo } from '../types';

export const useRoleDetail = (
  roleName: Ref<string>,
  connection: Ref<Connection | undefined>
) => {
  const roleInfo = ref<RoleInfo | null>(null);
  const inheritedRoles = ref<RoleInheritanceNode[]>([]);
  const isLoadingInheritance = ref(false);

  const isLoading = ref(false);
  const permissions = ref<RolePermissions | null>(null);
  const error = ref<string | null>(null);

  const fetchRoleInfo = async () => {
    if (!connection.value || !roleName.value) return;

    try {
      const response = await $fetch<DatabaseRole>(
        '/api/database-roles/get-role',
        {
          method: 'POST',
          body: {
            ...getConnectionParams(connection.value),
            roleName: roleName.value,
          },
        }
      );

      const role = response;
      if (role) {
        roleInfo.value = {
          isSuperuser: role.isSuperuser,
          canLogin: role.canLogin,
          canCreateDb: role.canCreateDb,
          canCreateRole: role.canCreateRole,
          isReplication: role.isReplication,
          connectionLimit: role.connectionLimit,
          validUntil: role.validUntil,
          memberOf: role.memberOf,
        };
      }
    } catch (err) {
      console.error('Error fetching role info:', err);
    }
  };

  const fetchInheritance = async () => {
    if (!connection.value || !roleName.value) return;
    isLoadingInheritance.value = true;
    try {
      const response = await $fetch<RoleInheritanceNode[]>(
        '/api/database-roles/get-role-inheritance',
        {
          method: 'POST',
          body: {
            ...getConnectionParams(connection.value),
            roleName: roleName.value,
          },
        }
      );
      inheritedRoles.value = response;
    } catch (err) {
      console.error('Error fetching role inheritance:', err);
      inheritedRoles.value = [];
    } finally {
      isLoadingInheritance.value = false;
    }
  };

  const fetchPermissions = async () => {
    if (!connection.value || !roleName.value) return;

    isLoading.value = true;
    error.value = null;

    try {
      const response = await $fetch<RolePermissions>(
        '/api/database-roles/get-permissions',
        {
          method: 'POST',
          body: {
            ...getConnectionParams(connection.value),
            roleName: roleName.value,
          },
        }
      );

      permissions.value = response;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Failed to fetch permissions';
      console.error('Error fetching permissions:', err);
    } finally {
      isLoading.value = false;
    }
  };

  // Load on mount and when role changes
  onMounted(() => {
    fetchPermissions();
    fetchRoleInfo();
    fetchInheritance();
  });
  watch(roleName, () => {
    fetchPermissions();
    fetchRoleInfo();
    fetchInheritance();
  });

  return {
    roleInfo,
    inheritedRoles,
    isLoadingInheritance,
    isLoading,
    permissions,
    error,
    fetchPermissions,
  };
};
