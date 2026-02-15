<script setup lang="ts">
import { LoadingOverlay } from '#components';
import DatabasePermissionCard from '~/components/modules/management-users/components/DatabasePermissionCard.vue';
import GrantRevokeDialog from '~/components/modules/management-users/components/GrantRevokeDialog.vue';
import RoleAttributesCard from '~/components/modules/management-users/components/RoleAttributesCard.vue';
import { useDatabasePermissions } from '~/components/modules/management-users/hooks/useDatabaseRoles';
import { useAppContext } from '~/core/contexts/useAppContext';
import type {
  RolePermissions,
  ObjectPermission,
  ObjectType,
  PrivilegeType,
  RoleInheritanceNode,
  DatabaseRole,
} from '~/core/types';

definePageMeta({
  keepalive: true,
});

const route = useRoute('workspaceId-connectionId-user-permissions-roleName');
const { connectionStore } = useAppContext();

const roleName = computed(() => route.params.roleName as string);
const dbConnectionString = computed(
  () => connectionStore.selectedConnection?.connectionString || ''
);

// Extract current database name from connection string
const currentDatabaseName = computed(() => {
  const connStr = dbConnectionString.value;
  if (!connStr) return '';

  try {
    const url = new URL(connStr);
    return url.pathname.slice(1) || '';
  } catch {
    const match = connStr.match(/\/([^/?]+)(\?|$)/);
    return match?.[1] || '';
  }
});

const isCurrentDatabase = (dbName: string) => {
  return currentDatabaseName.value.toLowerCase() === dbName.toLowerCase();
};

// Fetch role info
const roleInfo = ref<{
  isSuperuser: boolean;
  canLogin: boolean;
  canCreateDb: boolean;
  canCreateRole: boolean;
  isReplication: boolean;
  connectionLimit: number;
  validUntil: string | null;
  memberOf: string[];
} | null>(null);
const inheritedRoles = ref<RoleInheritanceNode[]>([]);

const fetchRoleInfo = async () => {
  if (!dbConnectionString.value || !roleName.value) return;

  try {
    const response = await $fetch<DatabaseRole>(
      '/api/database-roles/get-role',
      {
        method: 'POST',
        body: {
          dbConnectionString: dbConnectionString.value,
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
const isLoadingInheritance = ref(false);
const fetchInheritance = async () => {
  if (!dbConnectionString.value || !roleName.value) return;
  isLoadingInheritance.value = true;
  try {
    const response = await $fetch<RoleInheritanceNode[]>(
      '/api/database-roles/get-role-inheritance',
      {
        method: 'POST',
        body: {
          dbConnectionString: dbConnectionString.value,
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

// Fetch permissions
const isLoading = ref(false);
const isMutating = ref(false);
const permissions = ref<RolePermissions | null>(null);
const error = ref<string | null>(null);

const fetchPermissions = async () => {
  if (!dbConnectionString.value || !roleName.value) return;

  isLoading.value = true;
  error.value = null;

  try {
    const response = await $fetch<RolePermissions>(
      '/api/database-roles/get-permissions',
      {
        method: 'POST',
        body: {
          dbConnectionString: dbConnectionString.value,
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

// Database-level permissions
const {
  isLoading: isLoadingDatabases,
  databasePermissions,
  fetchDatabasePermissions,
} = useDatabasePermissions(dbConnectionString);

const expandedDatabases = ref<Set<string>>(new Set());

const toggleDatabase = (dbName: string) => {
  if (expandedDatabases.value.has(dbName)) {
    expandedDatabases.value.delete(dbName);
  } else {
    expandedDatabases.value.add(dbName);
  }
};

const isDatabaseExpanded = (dbName: string) =>
  expandedDatabases.value.has(dbName);

// Fetch database permissions
onMounted(() => fetchDatabasePermissions(roleName.value));
watch(roleName, name => fetchDatabasePermissions(name));

// Grant/Revoke Dialog State
const dialogOpen = ref(false);
const dialogMode = ref<'grant' | 'update'>('grant');
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

const onDialogConfirm = async (data: {
  objectType: ObjectType;
  schemaName: string;
  objectName: string;
  grant: PrivilegeType[];
  revoke: PrivilegeType[];
}) => {
  if (!dbConnectionString.value || !roleName.value) return;

  isMutating.value = true;

  try {
    const requests: Promise<unknown>[] = [];

    // Grant new privileges
    if (data.grant.length > 0) {
      requests.push(
        $fetch<unknown>('/api/database-roles/grant-permission', {
          method: 'POST',
          body: {
            dbConnectionString: dbConnectionString.value,
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
            dbConnectionString: dbConnectionString.value,
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
    await fetchPermissions();
  } catch (err) {
    console.error('Error updating permissions:', err);
  } finally {
    isMutating.value = false;
  }
};
</script>

<template>
  <div class="flex flex-col h-full p-1 relative">
    <div class="flex flex-col h-full border rounded-md overflow-hidden">
      <!-- Header -->
      <div class="flex items-center gap-3 px-4 py-1 bg-sidebar">
        <div>
          <p class="font-normal text-sm">{{ roleName }}</p>
        </div>
        <div class="ml-auto flex items-center gap-2">
          <!-- <Button
            variant="outline"
            size="xs"
            :disabled="isLoading || isMutating"
            @click="onOpenGrantDialog"
          >
            <Icon name="hugeicons:plus-sign" class="size-4 mr-1" />
            Grant Permission
          </Button> -->
          <Button
            variant="outline"
            size="iconSm"
            :disabled="isLoading"
            @click="fetchPermissions"
          >
            <Icon
              :name="isLoading ? 'lucide:loader-2' : 'lucide:refresh-cw'"
              :class="['size-4', isLoading && 'animate-spin']"
            />
          </Button>
        </div>
      </div>

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
        <!-- Role Attributes -->
        <RoleAttributesCard :role-info="roleInfo" />

        <!-- Inherited Roles -->
        <div class="px-4 pt-0 pb-3">
          <Collapsible :default-open="true">
            <template #default="{ open }">
              <div class="flex items-center gap-2 mb-2">
                <div class="flex items-center gap-2">
                  <Icon
                    name="lucide:git-branch"
                    class="size-4 text-muted-foreground"
                  />
                  <p class="text-sm font-medium">Inherited from</p>
                </div>

                <CollapsibleTrigger as-child>
                  <div
                    variant="secondary"
                    class="text-xs cursor-pointer text-muted-foreground flex items-center gap-1"
                  >
                    <span class="text-xs ml-1">{{
                      open ? `Collapse` : `Expand`
                    }}</span>

                    <Icon
                      name="lucide:chevron-down"
                      :class="[
                        'size-4 transition-transform',
                        open && 'rotate-180',
                      ]"
                    />
                  </div>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <div
                  v-if="isLoadingInheritance"
                  class="flex items-center gap-2 text-muted-foreground"
                >
                  <Icon name="lucide:loader-2" class="size-4 animate-spin" />
                  <span class="text-sm">Loading inheritance...</span>
                </div>
                <div
                  v-else-if="inheritedRoles.length === 0"
                  class="text-sm text-muted-foreground"
                >
                  No inherited roles
                </div>
                <div v-else class="space-y-1">
                  <div
                    v-for="(role, index) in inheritedRoles"
                    :key="`${role.roleName}-${index}`"
                    class="flex items-center text-sm gap-1 hover:bg-accent rounded-sm"
                    :style="{ paddingLeft: `${role.depth * 16}px` }"
                  >
                    <Icon
                      name="lucide:corner-down-right"
                      class="size-3 text-muted-foreground"
                    />
                    <span>{{ role.roleName }}</span>
                  </div>
                </div>
              </CollapsibleContent>
            </template>
          </Collapsible>
        </div>

        <!-- Database Permissions Section -->
        <div class="flex flex-col flex-1 min-h-0 p-4 pt-0">
          <div class="flex items-center gap-2 mb-3 shrink-0">
            <Icon name="hugeicons:database" class="size-5 text-yellow-400" />
            <p class="text-sm font-medium">Database Access</p>
            <Badge variant="secondary" class="text-xs">
              {{ databasePermissions.filter(d => d.canConnect).length }}
            </Badge>
          </div>

          <div
            v-if="isLoadingDatabases"
            class="flex items-center gap-2 text-muted-foreground"
          >
            <Icon name="lucide:loader-2" class="size-4 animate-spin" />
            <span class="text-sm">Loading databases...</span>
          </div>

          <div
            v-else-if="databasePermissions.length === 0"
            class="text-sm text-muted-foreground"
          >
            No database permissions found
          </div>

          <div v-else class="space-y-1 flex-1 overflow-y-auto">
            <DatabasePermissionCard
              v-for="db in databasePermissions"
              :key="db.databaseName"
              :database="db"
              :is-expanded="isDatabaseExpanded(db.databaseName)"
              :is-current-database="isCurrentDatabase(db.databaseName)"
              :permissions="permissions"
              @toggle="toggleDatabase(db.databaseName)"
              @update-permission="onUpdatePermission"
            />
          </div>
        </div>
      </template>

      <!-- Empty State -->
      <div
        v-else
        class="flex-1 flex flex-col items-center justify-center text-muted-foreground"
      >
        <Icon name="hugeicons:shield-01" class="size-16 mb-4 opacity-50" />
        <p class="text-sm">No permissions data available</p>
      </div>
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
