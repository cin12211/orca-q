import type { SchemaMetaData } from '~/core/types';
import {
  PUBLIC_SCHEMA_ID,
  useSchemaStore,
  useTabViewsStore,
  useWorkspacesStore,
  useWSStateStore,
  type Schema,
} from '../stores';
import {
  useManagementConnectionStore,
  type Connection,
} from '../stores/managementConnectionStore';

export const useAppContext = () => {
  const { start, finish } = useAppLoading();

  const wsStateStore = useWSStateStore();
  const workspaceStore = useWorkspacesStore();
  const connectionStore = useManagementConnectionStore();
  const schemaStore = useSchemaStore();
  const tabViewStore = useTabViewsStore();
  const { wsState, workspaceId, connectionId, allWsStates } =
    toRefs(wsStateStore);

  const createConnection = async (connection: Connection) => {
    await connectionStore.createNewConnection(connection);
  };

  const setSchemaId = (schemaId: string) => {
    if (!workspaceId.value || !connectionId.value) {
      throw new Error('No workspace or connection selected');
    }

    wsStateStore.setSchemaId({
      schemaId,
      connectionId: connectionId.value,
      workspaceId: workspaceId.value,
    });
  };

  const connectToConnection = async ({
    connId,
    isRefresh,
    wsId,
  }: {
    wsId: string;
    connId: string;
    isRefresh?: boolean;
  }) => {
    start();

    try {
      // 1. Ensure stores are hydrated (safety check)
      if (!connectionStore.connections.length) {
        await connectionStore.loadPersistData();
      }

      // 2. Validate Connection existence
      const connectionsByWsId =
        connectionStore.getConnectionsByWorkspaceId(wsId);
      const connection = connectionsByWsId.find(c => c.id === connId);

      if (!connection) {
        throw new Error(`Connection ${connId} not found in workspace ${wsId}`);
      }

      // 3. Ensure WorkspaceState exists for this context
      let currentState = wsStateStore.getStateById({
        workspaceId: wsId,
        connectionId: connId,
      });

      if (!currentState) {
        console.log(
          `[useAppContext] Creating missing WSState for ${wsId}/${connId}`
        );
        currentState = await wsStateStore.onCreateNewWSState({
          id: wsId,
          connectionId: connId,
        });
      }

      // 4. Fetch Schemas
      const result = await schemaStore.fetchSchemas({
        connectionId: connId,
        workspaceId: wsId,
        connection,
        isRefresh,
      });

      const currentSchema = currentState?.connectionStates?.find(
        connectionState => connectionState.id === connId
      );

      if (!currentSchema?.schemaId) {
        const contextSchemas = (schemaStore.schemas[connId] || []).filter(
          s => s.connectionId === connId && s.workspaceId === wsId
        );

        let firstSchemaName = result?.firstSchemaName;
        let includedPublic = result?.includedPublic;

        if (!result) {
          const publicSchema = contextSchemas.find(
            s => s.name === PUBLIC_SCHEMA_ID
          );
          includedPublic = !!publicSchema;
          firstSchemaName = contextSchemas[0]?.name;
        }

        await wsStateStore.setSchemaId({
          connectionId: connId,
          workspaceId: wsId,
          schemaId: includedPublic
            ? PUBLIC_SCHEMA_ID
            : firstSchemaName || PUBLIC_SCHEMA_ID,
        });
      }

      await schemaStore.fetchReservedSchemas({
        connectionId: connId,
        connection,
      });
    } catch (e: any) {
      console.error('[useAppContext] Connection error:', e);
      // You could trigger a toast here if sonner is available
      // toast.error(`Failed to connect: ${e.message}`);
    } finally {
      finish();
    }
  };

  const openWorkspaceWithConnection = async ({
    connId,
    wsId,
    onSuccess,
  }: {
    connId: string;
    wsId: string;
    onSuccess?: () => Promise<void>;
  }) => {
    await navigateTo({
      name: 'workspaceId-connectionId',
      params: {
        workspaceId: wsId,
        connectionId: connId,
      },
    });

    await workspaceStore.updateLastOpened(wsId);

    let wsStateUpdated = allWsStates.value.find(
      ws => ws.id === wsId && ws.connectionId === connId
    );

    if (!wsStateUpdated) {
      wsStateUpdated = await wsStateStore.onCreateNewWSState({
        id: wsId,
        connectionId: connId,
      });
    }

    await connectToConnection({
      connId: connId,
      wsId: wsId,
      isRefresh: false,
    });

    // Ensure persisted tabs are loaded, then restore the previously active tab.
    // The watcher in useTabViewsStore fires asynchronously; we await explicitly
    // so tab navigation always has the full tab list available.
    await tabViewStore.loadPersistData();
    await tabViewStore.onActiveCurrentTab(connId);

    await onSuccess?.();
  };

  return {
    // Stores
    workspaceStore,
    connectionStore,
    schemaStore,
    tabViewStore,
    wsStateStore,

    // State
    wsState,

    // Actions
    createConnection,
    setSchemaId,
    connectToConnection,
    openWorkspaceWithConnection,
  };
};
