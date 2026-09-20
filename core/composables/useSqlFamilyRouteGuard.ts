import {
  DEFAULT_CONNECTION_CONTEXT,
  isSqlFamilyConnection,
} from '~/core/constants/connection-capabilities';
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';
import { useWorkspaceConnectionRoute } from './useWorkspaceConnectionRoute';

/**
 * Sends the user back to the connection root when the active connection is not
 * part of the SQL family. Reactive rather than a route middleware because the
 * selected connection can change (or hydrate) while the page stays mounted.
 */
export function useSqlFamilyRouteGuard() {
  const { workspaceId, connectionId } = useWorkspaceConnectionRoute();
  const connectionStore = useManagementConnectionStore();

  const selectedConnection = computed(() => connectionStore.selectedConnection);

  const isSqlFamily = computed(() =>
    isSqlFamilyConnection(
      selectedConnection.value ?? DEFAULT_CONNECTION_CONTEXT
    )
  );

  watchEffect(() => {
    if (!selectedConnection.value || isSqlFamily.value) {
      return;
    }

    navigateTo(
      {
        name: 'workspaceId-connectionId',
        params: {
          workspaceId: workspaceId.value,
          connectionId: connectionId.value,
        },
        replace: true,
      },
      { replace: true }
    );
  });

  return { isSqlFamily, selectedConnection };
}
