import type { SchemaMetaData } from '~/server/api/get-schema-meta-data';
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

    if (!connectionStore.connections.length) {
      await connectionStore.loadPersistData();
    }

    const connectionsByWsId = connectionStore.getConnectionsByWorkspaceId(wsId);

    const connection = connectionsByWsId.find(
      connection => connection.id === connId
    );

    if (!connection) {
      finish();
      throw new Error('No connection found');
    }

    try {
      const dbConnectionString = connection.connectionString || '';

      const result = await schemaStore.fetchSchemas({
        connectionId: connId,
        workspaceId: wsId,
        dbConnectionString,
        isRefresh,
      });

      // If we got a result, it means we fetched schemas (or they existed and we used them,
      // but fetchSchemas returns void if it didn't fetch... actually it returns undefined if early return.
      // Wait, let's check fetchSchemas return type. It returns object if fetched, undefined if not fetched (existing).
      // But we need to handle setting the default schema if none is selected.

      const currentState = wsStateStore.getStateById({
        workspaceId: wsId,
        connectionId: connId,
      });

      const currentSchema = currentState?.connectionStates?.find(
        connectionState => connectionState.id === connId
      );

      if (!currentSchema?.schemaId) {
        // If no schema selected, select the first one or public
        // We need to know what schemas are available.
        // If we fetched new ones, we have them in result.
        // If we used existing ones, we can look them up.

        // Let's get the schemas for this context from store
        const contextSchemas = (schemaStore.schemas[connId] || []).filter(
          s => s.connectionId === connId && s.workspaceId === wsId
        );

        let firstSchemaName = result?.firstSchemaName;
        let includedPublic = result?.includedPublic;

        if (!result) {
          // Logic if we didn't fetch (already valid)
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
        dbConnectionString,
      });
    } catch (e) {
      console.error(e);
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
