import type { Connection } from '~/core/stores';
import { useDatabasePermissions } from './useDatabaseRoles';

export const useRoleDatabaseAccess = (
  roleName: Ref<string>,
  connection: Ref<Connection | undefined>
) => {
  // Extract current database name from connection string
  const currentDatabaseName = computed(() => {
    if (!connection.value) return '';
    if (connection.value.database) return connection.value.database;
    const connStr = connection.value.connectionString;
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

  const {
    isLoading: isLoadingDatabases,
    databasePermissions,
    fetchDatabasePermissions,
  } = useDatabasePermissions(connection);

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

  onMounted(() => fetchDatabasePermissions(roleName.value));
  watch(roleName, name => fetchDatabasePermissions(name));

  return {
    isLoadingDatabases,
    databasePermissions,
    isCurrentDatabase,
    toggleDatabase,
    isDatabaseExpanded,
  };
};
