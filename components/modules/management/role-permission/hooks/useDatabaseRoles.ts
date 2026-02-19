import type {
  DatabaseRole,
  RolePermissions,
  GrantRevokeRequest,
  GrantRevokeResponse,
  CreateRoleRequest,
  DeleteRoleRequest,
  DatabasePermission,
  DatabaseInfo,
  SchemaInfo,
  SchemaObjects,
  BulkGrantRequest,
  BulkGrantResponse,
} from '~/core/types';

/**
 * Composable for managing database roles data
 */
export const useDatabaseRoles = (dbConnectionString: Ref<string>) => {
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const roles = ref<DatabaseRole[]>([]);

  /**
   * Fetch all database roles
   */
  const fetchRoles = async () => {
    if (!dbConnectionString.value) {
      error.value = 'No database connection string provided';
      return;
    }

    isLoading.value = true;
    error.value = null;

    try {
      const response = await $fetch<DatabaseRole[]>(
        '/api/database-roles/get-roles',
        {
          method: 'POST',
          body: { dbConnectionString: dbConnectionString.value },
        }
      );

      roles.value = response;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Failed to fetch roles';
      console.error('Error fetching database roles:', err);
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Refresh roles data
   */
  const refresh = () => fetchRoles();

  /**
   * Get roles categorized by type
   */
  const categorizedRoles = computed(() => {
    const superusers: DatabaseRole[] = [];
    const users: DatabaseRole[] = [];
    const roleOnly: DatabaseRole[] = [];

    for (const role of roles.value) {
      if (role.isSuperuser) {
        superusers.push(role);
      } else if (role.canLogin) {
        users.push(role);
      } else {
        roleOnly.push(role);
      }
    }

    return { superusers, users, roles: roleOnly };
  });

  return {
    isLoading,
    error,
    roles,
    categorizedRoles,
    fetchRoles,
    refresh,
  };
};

/**
 * Composable for creating/deleting roles
 */
export const useRoleMutations = (dbConnectionString: Ref<string>) => {
  const isCreating = ref(false);
  const isDeleting = ref(false);
  const error = ref<string | null>(null);
  const extractControlPlaneError = (message: string): string | null => {
    const marker = 'control plane:';
    const markerIndex = message.indexOf(marker);
    if (markerIndex === -1) return null;
    const afterMarker = message.slice(markerIndex + marker.length).trim();
    const firstBrace = afterMarker.indexOf('{');
    const lastBrace = afterMarker.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1) return null;
    const jsonPart = afterMarker.slice(firstBrace, lastBrace + 1);
    try {
      const parsed = JSON.parse(jsonPart) as { error?: string };
      if (parsed?.error && typeof parsed.error === 'string') {
        return parsed.error;
      }
    } catch {
      return null;
    }
    return null;
  };

  /**
   * Create a new role
   */
  const createRole = async (
    request: Omit<CreateRoleRequest, 'dbConnectionString'>
  ): Promise<GrantRevokeResponse | null> => {
    if (!dbConnectionString.value) {
      error.value = 'No database connection string provided';
      return null;
    }

    isCreating.value = true;
    error.value = null;

    try {
      const response = await $fetch<GrantRevokeResponse>(
        '/api/database-roles/create-role',
        {
          method: 'POST',
          body: {
            ...request,
            dbConnectionString: dbConnectionString.value,
          },
        }
      );

      return response;
    } catch (err) {
      const rawMessage =
        (err as any)?.data?.statusMessage ||
        (err as any)?.data?.message ||
        (err instanceof Error ? err.message : 'Failed to create role');
      const extracted = extractControlPlaneError(rawMessage);
      const message =
        extracted ||
        rawMessage.replace(/^Failed to create role:\s*/i, '').trim();
      error.value = message;
      console.error('Error creating role:', err);
      return {
        success: false,
        message,
        sql: '',
      };
    } finally {
      isCreating.value = false;
    }
  };

  /**
   * Delete a role
   */
  const deleteRole = async (
    roleName: string
  ): Promise<GrantRevokeResponse | null> => {
    if (!dbConnectionString.value) {
      error.value = 'No database connection string provided';
      return null;
    }

    isDeleting.value = true;
    error.value = null;

    try {
      const response = await $fetch<GrantRevokeResponse>(
        '/api/database-roles/delete-role',
        {
          method: 'POST',
          body: {
            dbConnectionString: dbConnectionString.value,
            roleName,
          },
        }
      );

      return response;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Failed to delete role';
      console.error('Error deleting role:', err);
      return null;
    } finally {
      isDeleting.value = false;
    }
  };

  return {
    isCreating,
    isDeleting,
    error,
    createRole,
    deleteRole,
  };
};

/**
 * Composable for managing role permissions
 */
export const useRolePermissions = (dbConnectionString: Ref<string>) => {
  const isLoading = ref(false);
  const isMutating = ref(false);
  const error = ref<string | null>(null);
  const permissions = ref<RolePermissions | null>(null);

  /**
   * Fetch permissions for a specific role
   */
  const fetchPermissions = async (roleName: string) => {
    if (!dbConnectionString.value || !roleName) {
      error.value = 'Missing connection string or role name';
      return;
    }

    isLoading.value = true;
    error.value = null;

    try {
      const response = await $fetch<RolePermissions>(
        '/api/database-roles/get-permissions',
        {
          method: 'POST',
          body: {
            dbConnectionString: dbConnectionString.value,
            roleName,
          },
        }
      );

      permissions.value = response;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Failed to fetch permissions';
      console.error('Error fetching role permissions:', err);
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Grant permission to a role
   */
  const grantPermission = async (
    request: Omit<GrantRevokeRequest, 'dbConnectionString'>
  ): Promise<GrantRevokeResponse | null> => {
    if (!dbConnectionString.value) {
      error.value = 'No database connection string provided';
      return null;
    }

    isMutating.value = true;
    error.value = null;

    try {
      const response = await $fetch<GrantRevokeResponse>(
        '/api/database-roles/grant-permission',
        {
          method: 'POST',
          body: {
            ...request,
            dbConnectionString: dbConnectionString.value,
          },
        }
      );

      // Refresh permissions after grant
      await fetchPermissions(request.roleName);

      return response;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Failed to grant permission';
      console.error('Error granting permission:', err);
      return null;
    } finally {
      isMutating.value = false;
    }
  };

  /**
   * Revoke permission from a role
   */
  const revokePermission = async (
    request: Omit<GrantRevokeRequest, 'dbConnectionString'>
  ): Promise<GrantRevokeResponse | null> => {
    if (!dbConnectionString.value) {
      error.value = 'No database connection string provided';
      return null;
    }

    isMutating.value = true;
    error.value = null;

    try {
      const response = await $fetch<GrantRevokeResponse>(
        '/api/database-roles/revoke-permission',
        {
          method: 'POST',
          body: {
            ...request,
            dbConnectionString: dbConnectionString.value,
          },
        }
      );

      // Refresh permissions after revoke
      await fetchPermissions(request.roleName);

      return response;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Failed to revoke permission';
      console.error('Error revoking permission:', err);
      return null;
    } finally {
      isMutating.value = false;
    }
  };

  /**
   * Clear current permissions
   */
  const clearPermissions = () => {
    permissions.value = null;
    error.value = null;
  };

  return {
    isLoading,
    isMutating,
    error,
    permissions,
    fetchPermissions,
    grantPermission,
    revokePermission,
    clearPermissions,
  };
};

/**
 * Composable for fetching database-level permissions
 */
export const useDatabasePermissions = (dbConnectionString: Ref<string>) => {
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const databasePermissions = ref<DatabasePermission[]>([]);

  /**
   * Fetch database permissions for a role
   */
  const fetchDatabasePermissions = async (roleName: string) => {
    if (!dbConnectionString.value || !roleName) {
      error.value = 'Missing connection string or role name';
      return;
    }

    isLoading.value = true;
    error.value = null;

    try {
      const response = await $fetch<DatabasePermission[]>(
        '/api/database-roles/get-databases-with-permissions',
        {
          method: 'POST',
          body: {
            dbConnectionString: dbConnectionString.value,
            roleName,
          },
        }
      );

      databasePermissions.value = response;
    } catch (err) {
      error.value =
        err instanceof Error
          ? err.message
          : 'Failed to fetch database permissions';
      console.error('Error fetching database permissions:', err);
    } finally {
      isLoading.value = false;
    }
  };

  return {
    isLoading,
    error,
    databasePermissions,
    fetchDatabasePermissions,
  };
};

/**
 * Composable for fetching all databases
 */
export const useDatabases = (dbConnectionString: Ref<string>) => {
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const databases = ref<DatabaseInfo[]>([]);

  /**
   * Fetch all databases
   */
  const fetchDatabases = async () => {
    if (!dbConnectionString.value) {
      error.value = 'No database connection string provided';
      return;
    }

    isLoading.value = true;
    error.value = null;

    try {
      const response = await $fetch<DatabaseInfo[]>(
        '/api/database-roles/get-databases',
        {
          method: 'POST',
          body: { dbConnectionString: dbConnectionString.value },
        }
      );

      databases.value = response;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Failed to fetch databases';
      console.error('Error fetching databases:', err);
    } finally {
      isLoading.value = false;
    }
  };

  return {
    isLoading,
    error,
    databases,
    fetchDatabases,
  };
};

/**
 * Composable for fetching schemas
 */
export const useSchemas = (dbConnectionString: Ref<string>) => {
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const schemas = ref<SchemaInfo[]>([]);

  /**
   * Fetch all schemas in the database
   */
  const fetchSchemas = async () => {
    if (!dbConnectionString.value) {
      error.value = 'No database connection string provided';
      return;
    }

    isLoading.value = true;
    error.value = null;

    try {
      const response = await $fetch<SchemaInfo[]>(
        '/api/database-roles/get-schemas',
        {
          method: 'POST',
          body: { dbConnectionString: dbConnectionString.value },
        }
      );

      schemas.value = response;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Failed to fetch schemas';
      console.error('Error fetching schemas:', err);
    } finally {
      isLoading.value = false;
    }
  };

  return {
    isLoading,
    error,
    schemas,
    fetchSchemas,
  };
};

/**
 * Composable for fetching objects in a schema
 */
export const useSchemaObjects = (dbConnectionString: Ref<string>) => {
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const schemaObjects = ref<SchemaObjects | null>(null);

  /**
   * Fetch objects in a specific schema
   */
  const fetchSchemaObjects = async (schemaName: string) => {
    if (!dbConnectionString.value || !schemaName) {
      error.value = 'Missing connection string or schema name';
      return;
    }

    isLoading.value = true;
    error.value = null;

    try {
      const response = await $fetch<SchemaObjects>(
        '/api/database-roles/get-schema-objects',
        {
          method: 'POST',
          body: {
            dbConnectionString: dbConnectionString.value,
            schemaName,
          },
        }
      );

      schemaObjects.value = response;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Failed to fetch schema objects';
      console.error('Error fetching schema objects:', err);
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Clear current objects
   */
  const clearSchemaObjects = () => {
    schemaObjects.value = null;
    error.value = null;
  };

  return {
    isLoading,
    error,
    schemaObjects,
    fetchSchemaObjects,
    clearSchemaObjects,
  };
};

/**
 * Composable for bulk granting permissions
 */
export const useBulkGrantPermissions = (dbConnectionString: Ref<string>) => {
  const isGranting = ref(false);
  const error = ref<string | null>(null);

  /**
   * Grant multiple permissions at once
   */
  const grantBulkPermissions = async (
    request: Omit<BulkGrantRequest, 'dbConnectionString'>
  ): Promise<BulkGrantResponse | null> => {
    if (!dbConnectionString.value) {
      error.value = 'No database connection string provided';
      return null;
    }

    isGranting.value = true;
    error.value = null;

    try {
      const response = await $fetch<BulkGrantResponse>(
        '/api/database-roles/grant-bulk-permissions',
        {
          method: 'POST',
          body: {
            ...request,
            dbConnectionString: dbConnectionString.value,
          },
        }
      );

      return response;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Failed to grant permissions';
      console.error('Error granting bulk permissions:', err);
      return null;
    } finally {
      isGranting.value = false;
    }
  };

  return {
    isGranting,
    error,
    grantBulkPermissions,
  };
};
