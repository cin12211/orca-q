<script setup lang="ts">
import { LoadingOverlay } from '#components';
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';
import {
  DatabaseAccessSection,
  GrantRevokeDialog,
  InheritedRolesSection,
  RoleAttributesCard,
  RolePermissionHeader,
} from '../components';
import {
  useRoleDatabaseAccess,
  useRoleDetail,
  useRolePermissionDialog,
} from '../hooks';

const props = defineProps<{
  roleName: string;
}>();

const connectionStore = useManagementConnectionStore();

const roleName = toRef(props, 'roleName');
const connection = computed(() => connectionStore.selectedConnection);

const {
  roleInfo,
  inheritedRoles,
  isLoadingInheritance,
  isLoading,
  permissions,
  error,
  fetchPermissions,
} = useRoleDetail(roleName, connection);

const {
  isLoadingDatabases,
  databasePermissions,
  isCurrentDatabase,
  toggleDatabase,
  isDatabaseExpanded,
} = useRoleDatabaseAccess(roleName, connection);

const {
  isMutating,
  dialogOpen,
  dialogMode,
  dialogPermission,
  onUpdatePermission,
  onDialogConfirm,
} = useRolePermissionDialog({
  roleName,
  connection,
  onSaved: fetchPermissions,
});
</script>

<template>
  <div class="flex flex-col h-full p-1 relative">
    <div class="flex flex-col h-full border rounded-md overflow-hidden">
      <RolePermissionHeader
        :role-name="roleName"
        :is-loading="isLoading"
        @refresh="fetchPermissions"
      />

      <!-- Loading State -->
      <div v-if="isLoading" class="flex-1 flex items-center justify-center">
        <LoadingOverlay :visible="isLoading" />
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="flex-1 flex flex-col items-center justify-center p-4"
      >
        <Icon
          name="hugeicons:information-circle"
          class="size-12 text-destructive"
        />
        <p class="text-sm text-destructive">{{ error }}</p>
        <Button
          variant="outline"
          size="sm"
          class="mt-4 font-normal"
          @click="fetchPermissions"
        >
          Retry
        </Button>
      </div>

      <!-- Permissions Content -->
      <template v-else-if="permissions">
        <RoleAttributesCard :role-info="roleInfo" />

        <InheritedRolesSection
          :inherited-roles="inheritedRoles"
          :is-loading="isLoadingInheritance"
        />

        <DatabaseAccessSection
          :database-permissions="databasePermissions"
          :permissions="permissions"
          :is-loading="isLoadingDatabases"
          :is-database-expanded="isDatabaseExpanded"
          :is-current-database="isCurrentDatabase"
          @toggle="toggleDatabase"
          @update-permission="onUpdatePermission"
        />
      </template>

      <!-- Empty State -->
      <BaseEmpty
        v-else
        icon="hugeicons:shield-01"
        title="No data available"
        desc="No permissions data is available for the current selection."
      />
    </div>

    <!-- Grant/Revoke Dialog -->
    <GrantRevokeDialog
      v-model:open="dialogOpen"
      :mode="dialogMode"
      :roleName="roleName"
      :permission="dialogPermission"
      :loading="isMutating"
      @confirm="onDialogConfirm"
    />
  </div>
</template>
