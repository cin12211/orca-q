<script setup lang="ts">
import { refDebounced } from '@vueuse/core';
import { DEFAULT_DEBOUNCE_INPUT } from '~/core/constants';
import { useAppContext } from '~/core/contexts/useAppContext';
import type {
  CreateRoleRequest,
  DatabaseRole,
  SchemaGrant,
  ObjectGrant,
  PrivilegeType,
} from '~/core/types';
import { ManagementSidebarHeader } from '../shared';
import CreateUserModal from './components/CreateUserModal.vue';
import UserRolesTree from './components/UserRolesTree.vue';
import {
  useDatabaseRoles,
  useRoleMutations,
  useDatabases,
  useSchemas,
  useBulkGrantPermissions,
} from './hooks/useDatabaseRoles';

const { wsStateStore, connectionStore } = useAppContext();
const { connectionId, workspaceId } = toRefs(wsStateStore);

const connection = computed(() => {
  if (!connectionId.value) return undefined;
  return connectionStore.connections.find(c => c.id === connectionId.value);
});

const currentDatabaseName = computed(() => {
  if (!connection.value) return '';
  if (connection.value.database) return connection.value.database;
  if (connection.value.connectionString) {
    try {
      const url = new URL(connection.value.connectionString);
      return url.pathname?.replace(/^\//, '') || '';
    } catch {
      return '';
    }
  }
  return '';
});

const currentUsername = computed(() => {
  if (!connection.value) return '';
  if (connection.value.username) return connection.value.username;
  if (connection.value.connectionString) {
    try {
      const url = new URL(connection.value.connectionString);
      return url.username || '';
    } catch {
      return '';
    }
  }
  return '';
});

// Composables for data fetching
const {
  isLoading: isLoadingRoles,
  roles,
  fetchRoles,
  refresh: refreshRoles,
} = useDatabaseRoles(connection);

const currentUserRole = computed(() => {
  if (!currentUsername.value) return null;
  return roles.value.find(r => r.roleName === currentUsername.value) || null;
});

const canCreateUser = computed(() => {
  if (!connection.value) return false;
  if (!currentUserRole.value) return false;
  return (
    currentUserRole.value.isSuperuser || currentUserRole.value.canCreateRole
  );
});

const createUserDisabledReason = computed(() => {
  if (!connection.value) return 'Select a connection to create users';
  if (!currentUserRole.value)
    return 'Unable to verify role privileges for this connection';
  if (canCreateUser.value) return 'Create User';
  return 'Your role lacks CREATEROLE or SUPERUSER privileges';
});

const { isCreating, isDeleting, createRole, deleteRole } =
  useRoleMutations(connection);

const {
  isLoading: isLoadingDatabases,
  databases,
  fetchDatabases,
} = useDatabases(connection);

const {
  isLoading: isLoadingSchemas,
  schemas,
  fetchSchemas,
} = useSchemas(connection);

const { isGranting, grantBulkPermissions } =
  useBulkGrantPermissions(connection);

// UI State
const searchInput = shallowRef('');
const debouncedSearch = refDebounced(searchInput, DEFAULT_DEBOUNCE_INPUT);
const isRefreshing = ref(false);
const createModalOpen = ref(false);
const createError = ref<string | null>(null);

// Filtered roles based on search
const filteredRoles = computed(() => {
  if (!debouncedSearch.value) return roles.value;

  const query = debouncedSearch.value.toLowerCase();
  return roles.value.filter(role =>
    role.roleName.toLowerCase().includes(query)
  );
});

// Fetch roles when connection changes
watch(
  () => connection.value,
  async newValue => {
    if (newValue) {
      await fetchRoles();
    }
  },
  { immediate: true }
);

const onRefreshRoles = async () => {
  isRefreshing.value = true;
  await refreshRoles();
  isRefreshing.value = false;
};

const userRolesTreeRef = useTemplateRef<typeof UserRolesTree | null>(
  'userRolesTreeRef'
);

const isTreeCollapsed = computed(() => {
  return userRolesTreeRef.value ? !userRolesTreeRef.value.isExpandedAll : true;
});

const onToggleCollapse = () => {
  if (isTreeCollapsed.value) {
    userRolesTreeRef.value?.expandAll();
  } else {
    userRolesTreeRef.value?.collapseAll();
  }
};

const onClearError = () => {
  createError.value = null;
};

// Create user flow
const onOpenCreateModal = () => {
  if (!canCreateUser.value) return;
  createModalOpen.value = true;
  databases.value = [];
  void fetchDatabases();
};

const onFetchSchemas = async () => {
  schemas.value = [];
  await fetchSchemas();
};

const onCreateUser = async (data: {
  roleData: Omit<CreateRoleRequest, 'dbConnectionString'>;
  databaseGrants: { databaseName: string; privileges: PrivilegeType[] }[];
  schemaGrants: SchemaGrant[];
  objectGrants: ObjectGrant[];
}) => {
  createError.value = null;
  try {
    // Step 1: Create the role
    const result = await createRole(data.roleData);
    if (!result?.success) {
      createError.value =
        result?.message ||
        'Failed to create user. Please check the username and try again.';
      return;
    }

    // Step 2: Grant permissions if any
    const hasPermissions =
      data.databaseGrants.length > 0 ||
      data.schemaGrants.length > 0 ||
      data.objectGrants.length > 0;

    if (hasPermissions) {
      const grantResult = await grantBulkPermissions({
        roleName: data.roleData.roleName,
        databaseGrants: data.databaseGrants,
        schemaGrants: data.schemaGrants,
        objectGrants: data.objectGrants,
      });

      if (grantResult && !grantResult.success) {
        createError.value = `User created but some permissions failed: ${grantResult.totalFailed} of ${grantResult.results.length} grants failed.`;
        return;
      }
    }

    createModalOpen.value = false;
    await refreshRoles();
  } catch (error: any) {
    createError.value = error?.message || 'Failed to create user';
  }
};

// Delete user flow
const onDeleteUser = async (role: DatabaseRole) => {
  const result = await deleteRole(role.roleName);
  if (result?.success) {
    await refreshRoles();
  }
  return result;
};
</script>

<template>
  <div class="flex flex-col h-full w-full overflow-hidden">
    <ManagementSidebarHeader
      v-model:search="searchInput"
      title="Users & Roles"
      :show-connection="true"
      :workspace-id="workspaceId"
      :show-search="true"
      search-placeholder="Search users/roles..."
    >
      <template #actions>
        <Tooltip>
          <TooltipTrigger as-child>
            <span>
              <Button
                size="iconSm"
                variant="ghost"
                @click="onOpenCreateModal"
                :disabled="!canCreateUser"
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
            <Button
              size="iconSm"
              variant="ghost"
              @click="onRefreshRoles"
              :disabled="isRefreshing || !connection"
            >
              <Icon
                name="hugeicons:redo"
                :class="['size-4! min-w-4 ', isRefreshing && 'animate-spin']"
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Refresh Roles</TooltipContent>
        </Tooltip>
      </template>
    </ManagementSidebarHeader>

    <!-- No Connection State -->
    <div
      v-if="!connection"
      class="flex-1 flex flex-col items-center justify-center text-muted-foreground"
    >
      <Icon name="hugeicons:plug-socket" class="size-12 mb-2 opacity-50" />
      <p class="text-sm">Select a connection to view roles</p>
    </div>

    <!-- Main Content -->
    <template v-else>
      <!-- Roles Tree -->
      <div class="flex-1 overflow-y-auto min-h-0">
        <UserRolesTree
          ref="userRolesTreeRef"
          :roles="filteredRoles"
          :loading="isLoadingRoles"
          :onCreateUser="onOpenCreateModal"
          :canCreateUser="canCreateUser"
          :createUserDisabledReason="createUserDisabledReason"
          :onDeleteUser="onDeleteUser"
          :onRefresh="onRefreshRoles"
        />
      </div>
    </template>

    <!-- Create User Modal -->
    <CreateUserModal
      v-model:open="createModalOpen"
      :loading="isCreating || isGranting"
      :databasesLoading="isLoadingDatabases"
      :schemasLoading="isLoadingSchemas"
      :databases="databases"
      :schemas="schemas"
      :currentDatabase="currentDatabaseName"
      :error="createError"
      @confirm="onCreateUser"
      @cancel="createModalOpen = false"
      @clearError="onClearError"
      @fetchSchemas="onFetchSchemas"
    />
  </div>
</template>
