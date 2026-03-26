import {
  useWorkspacesStore,
  useManagementConnectionStore,
} from '~/core/stores';
import type { Connection } from '~/core/stores/managementConnectionStore';
import type { Workspace } from '~/core/stores/useWorkspacesStore';

export default defineNuxtRouteMiddleware(async to => {
  const workspaceId = to.params.workspaceId as string;
  const connectionId = to.params.connectionId as string;

  // If we're not on a workspace route, we skip
  if (!workspaceId) {
    return;
  }

  const workspaceStore = useWorkspacesStore();
  const connectionStore = useManagementConnectionStore();

  // 1. Validate workspace
  const workspace = workspaceStore.workspaces.find(
    (ws: Workspace) => ws.id === workspaceId
  );

  if (!workspace) {
    console.error(`[Guard] Workspace not found: ${workspaceId}`);
    return showError({
      statusCode: 404,
      statusMessage: 'Workspace Not Found',
      message: `The workspace with ID "${workspaceId}" does not exist.`,
    });
  }

  // 2. If there is a connectionId in the route, validate it too
  if (connectionId) {
    const connections =
      connectionStore.getConnectionsByWorkspaceId(workspaceId);
    const connection = connections.find(
      (c: Connection) => c.id === connectionId
    );

    if (!connection) {
      console.error(`[Guard] Connection not found: ${connectionId}`);
      return showError({
        statusCode: 404,
        statusMessage: 'Connection Not Found',
        message: `The connection with ID "${connectionId}" was not found in this workspace.`,
      });
    }
  }

  // At this point, everything is valid.
});
