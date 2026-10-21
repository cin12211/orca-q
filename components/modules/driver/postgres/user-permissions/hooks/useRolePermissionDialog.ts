import { getConnectionParams } from '@/core/helpers/connection-helper';
import type { Connection } from '~/core/stores';
import type { ObjectPermission } from '~/core/types';
import type { PermissionChangePayload, PermissionDialogMode } from '../types';

interface UseRolePermissionDialogOptions {
  roleName: Ref<string>;
  connection: Ref<Connection | undefined>;
  onSaved: () => Promise<void>;
}

export const useRolePermissionDialog = ({
  roleName,
  connection,
  onSaved,
}: UseRolePermissionDialogOptions) => {
  const isMutating = ref(false);
  const dialogOpen = ref(false);
  const dialogMode = ref<PermissionDialogMode>('grant');
  const dialogPermission = ref<ObjectPermission | undefined>();

  const onOpenGrantDialog = () => {
    dialogMode.value = 'grant';
    dialogPermission.value = undefined;
    dialogOpen.value = true;
  };

  const onUpdatePermission = (permission: ObjectPermission) => {
    dialogMode.value = 'update';
    dialogPermission.value = permission;
    dialogOpen.value = true;
  };

  const onDialogConfirm = async (data: PermissionChangePayload) => {
    if (!connection.value || !roleName.value) return;

    isMutating.value = true;

    try {
      const requests: Promise<unknown>[] = [];

      // Grant new privileges
      if (data.grant.length > 0) {
        requests.push(
          $fetch<unknown>('/api/database-roles/grant-permission', {
            method: 'POST',
            body: {
              ...getConnectionParams(connection.value),
              roleName: roleName.value,
              objectType: data.objectType,
              schemaName: data.schemaName,
              objectName: data.objectName,
              privileges: data.grant,
            },
          })
        );
      }

      // Revoke removed privileges
      if (data.revoke.length > 0) {
        requests.push(
          $fetch<unknown>('/api/database-roles/revoke-permission', {
            method: 'POST',
            body: {
              ...getConnectionParams(connection.value),
              roleName: roleName.value,
              objectType: data.objectType,
              schemaName: data.schemaName,
              objectName: data.objectName,
              privileges: data.revoke,
            },
          })
        );
      }

      await Promise.all(requests);

      dialogOpen.value = false;
      await onSaved();
    } catch (err) {
      console.error('Error updating permissions:', err);
    } finally {
      isMutating.value = false;
    }
  };

  return {
    isMutating,
    dialogOpen,
    dialogMode,
    dialogPermission,
    onOpenGrantDialog,
    onUpdatePermission,
    onDialogConfirm,
  };
};
