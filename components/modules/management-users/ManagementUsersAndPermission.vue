<script setup lang="ts">
import { refDebounced } from '@vueuse/core';
import { useAppContext } from '~/shared/contexts/useAppContext';
import {
  useTabViewsStore,
  TabViewType,
} from '~/shared/stores/useTabViewsStore';
import type {
  CreateRoleRequest,
  DatabaseRole,
  SchemaGrant,
  ObjectGrant,
  PrivilegeType,
} from '~/shared/types';
import { DEFAULT_DEBOUNCE_INPUT } from '~/utils/constants';
import ConnectionSelector from '../selectors/ConnectionSelector.vue';
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
const tabViewStore = useTabViewsStore();

// Get the database connection string from the selected connection
const dbConnectionString = computed(() => {
  if (!connectionId.value) return '';
  const connection = connectionStore.connections.find(
    c => c.id === connectionId.value
  );
  return connection?.connectionString || '';
});

const currentDatabaseName = computed(() => {
  if (!connectionId.value) return '';
  const connection = connectionStore.connections.find(
    c => c.id === connectionId.value
  );
  if (!connection) return '';
  if (connection.database) return connection.database;
  if (connection.connectionString) {
    try {
      const url = new URL(connection.connectionString);
      return url.pathname?.replace(/^\//, '') || '';
    } catch {
      return '';
    }
  }
  return '';
});

const currentUsername = computed(() => {
  if (!connectionId.value) return '';
  const connection = connectionStore.connections.find(
    c => c.id === connectionId.value
  );
  if (!connection) return '';
  if (connection.username) return connection.username;
  if (connection.connectionString) {
    try {
      const url = new URL(connection.connectionString);
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
} = useDatabaseRoles(dbConnectionString);

const currentUserRole = computed(() => {
  if (!currentUsername.value) return null;
  return roles.value.find(r => r.roleName === currentUsername.value) || null;
});

const canCreateUser = computed(() => {
  if (!dbConnectionString.value) return false;
  if (!currentUserRole.value) return false;
  return (
    currentUserRole.value.isSuperuser || currentUserRole.value.canCreateRole
  );
});

const createUserDisabledReason = computed(() => {
  if (!dbConnectionString.value) return 'Select a connection to create users';
  if (!currentUserRole.value)
    return 'Unable to verify role privileges for this connection';
  if (canCreateUser.value) return 'Create User';
  return 'Your role lacks CREATEROLE or SUPERUSER privileges';
});

const { isCreating, isDeleting, createRole, deleteRole } =
  useRoleMutations(dbConnectionString);

const {
  isLoading: isLoadingDatabases,
  databases,
  fetchDatabases,
} = useDatabases(dbConnectionString);

const {
  isLoading: isLoadingSchemas,
  schemas,
  fetchSchemas,
} = useSchemas(dbConnectionString);

const { isGranting, grantBulkPermissions } =
  useBulkGrantPermissions(dbConnectionString);

// UI State
const searchInput = shallowRef('');
const debouncedSearch = refDebounced(searchInput, DEFAULT_DEBOUNCE_INPUT);
const isRefreshing = ref(false);
const createModalOpen = ref(false);
const createError = ref<string | null>(null);

// Selected role name - syncs with active tab
const selectedRoleName = ref<string | null>(null);

// Sync selected role with active tab
watch(
  () => tabViewStore.activeTab,
  activeTab => {
    if (activeTab?.type === TabViewType.UserPermissions) {
      // Extract roleName from routeParams
      const roleName = activeTab.routeParams?.roleName;
      if (typeof roleName === 'string') {
        selectedRoleName.value = roleName;
      }
    }
  },
  { immediate: true }
);

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
  () => dbConnectionString.value,
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
    <!-- Connection Selector -->
    <div class="relative w-full items-center px-2 pt-1 space-y-1 shrink-0">
      <div>
        <p
          class="text-sm font-medium text-muted-foreground leading-none block pb-1"
        >
          Connections
        </p>
        <ConnectionSelector class="w-full!" :workspaceId="workspaceId" />
      </div>
    </div>

    <!-- Header with Actions -->
    <div class="px-2 pt-2 flex items-center justify-between shrink-0">
      <p class="text-sm font-medium text-muted-foreground leading-none">
        Users & Roles
      </p>

      <div class="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger as-child>
            <span>
              <Button
                size="iconSm"
                variant="ghost"
                @click="onOpenCreateModal"
                :disabled="!canCreateUser"
              >
                <Icon
                  name="lucide:user-plus"
                  class="size-4! min-w-4 text-muted-foreground"
                />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{{ createUserDisabledReason }}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              size="iconSm"
              variant="ghost"
              @click="onRefreshRoles"
              :disabled="isRefreshing || !dbConnectionString"
            >
              <Icon
                name="lucide:refresh-ccw"
                :class="[
                  'size-4! min-w-4 text-muted-foreground',
                  isRefreshing && 'animate-spin',
                ]"
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Refresh Roles</TooltipContent>
        </Tooltip>
      </div>
    </div>

    <!-- Search -->
    <div class="px-2 pb-1 pt-1 shrink-0">
      <div class="relative w-full">
        <Input
          type="text"
          placeholder="Search users/roles..."
          class="pr-6 w-full h-8"
          v-model="searchInput"
        />

        <div
          v-if="searchInput"
          class="absolute right-2 top-1.5 w-4 cursor-pointer hover:bg-accent"
          @click="searchInput = ''"
        >
          <Icon name="lucide:x" class="stroke-3! text-muted-foreground" />
        </div>
      </div>
    </div>

    <!-- No Connection State -->
    <div
      v-if="!dbConnectionString"
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
          :roles="filteredRoles"
          :loading="isLoadingRoles"
          :selectedRoleName="selectedRoleName"
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
