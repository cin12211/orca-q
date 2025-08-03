import {
  PUBLIC_SCHEMA_ID,
  useSchemaStore,
  useTabViewsStore,
  useWorkspacesStore,
  useWSStateStore,
} from '../stores';
import {
  useManagementConnectionStore,
  type Connection,
} from '../stores/managementConnectionStore';

export const useAppContext = () => {
  const { start, finish } = useLoadingIndicator({
    duration: 2000,
    throttle: 200,
    estimatedProgress: (duration, elapsed) =>
      (2 / Math.PI) * 100 * Math.atan(((elapsed / duration) * 100) / 50),
  });

  const wsStateStore = useWSStateStore();
  const workspaceStore = useWorkspacesStore();
  const connectionStore = useManagementConnectionStore();
  const schemaStore = useSchemaStore();
  const tabViewStore = useTabViewsStore();
  const { wsState, workspaceId, connectionId, allWsStates } =
    toRefs(wsStateStore);
  const { schemas } = toRefs(schemaStore);

  const createConnection = async (connection: Connection) => {
    await connectionStore.createNewConnection(connection);
  };

  const setSchemaId = (schemaId: string) => {
    if (!workspaceId.value || !connectionId.value) {
      throw new Error('No workspace or connection selected');
      return;
    }

    wsStateStore.setSchemaId({
      schemaId,
      connectionId: connectionId.value,
      workspaceId: workspaceId.value,
    });
  };

  const fetchReservedTableSchemas = async ({
    wsId,
    connId,
    includeLoading,
  }: {
    wsId: string;
    connId: string;
    includeLoading?: boolean;
  }) => {
    const connectionsByWsId = connectionStore.getConnectionsByWorkspaceId(wsId);
    console.log(
      '🚀 ~ fetchReservedTableSchemas ~ connectionsByWsId:',
      connectionsByWsId
    );

    const connection = connectionsByWsId.find(
      connection => connection.id === connId
    );

    if (!connection) {
      throw new Error('No connection found');
    }

    includeLoading && start({ force: true });

    const reservedSchemas = await $fetch('/api/get-reverse-table-schemas', {
      method: 'POST',
      body: {
        dbConnectionString: connection.connectionString,
      },
    });

    includeLoading && finish();

    schemaStore.reservedSchemas = reservedSchemas.result;
  };

  const fetchCurrentSchema = async (dbConnectionString: string) => {
    start({ force: true });

    const databaseSource = await $fetch('/api/get-database-source', {
      method: 'POST',
      body: {
        dbConnectionString,
      },
    });

    finish();

    return databaseSource;
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
    const connectionsByWsId = connectionStore.getConnectionsByWorkspaceId(wsId);

    const connection = connectionsByWsId.find(
      connection => connection.id === connId
    );

    if (!connection) {
      throw new Error('No connection found');
      return;
    }

    const dbConnectionString: string = connection.connectionString || '';

    const databaseSource = await fetchCurrentSchema(dbConnectionString);

    let includedPublic = false;

    if (isRefresh) {
      schemas.value = [...schemas.value].filter(
        schema => schema.connectionId !== connId
      );
    }

    databaseSource.forEach(schema => {
      const schemaId = `${wsId}-${connId}-${schema.name}`;

      const isExitSchema = schemas.value.find(e => e.id === schemaId);

      if (schema.name === PUBLIC_SCHEMA_ID) {
        includedPublic = true;
      }

      if (!isExitSchema) {
        schemas.value.push({
          id: schemaId,
          workspaceId: wsState.value?.id || '',
          connectionId: connId,
          name: schema.name,
          functions: schema.functions || [],
          tables: schema.tables || [],
          views: schema.views || [],
          tableDetails: schema?.table_details || null,
        });
      }
    });

    const currentState = wsStateStore.getStateById({
      workspaceId: wsId,
      connectionId: connId,
    });

    const currentSchema = currentState?.connectionStates?.find(
      connectionState => connectionState.id === connId
    );

    if (!currentSchema?.schemaId) {
      await wsStateStore.setSchemaId({
        connectionId: connId,
        workspaceId: workspaceId.value || '',
        schemaId: includedPublic ? PUBLIC_SCHEMA_ID : databaseSource[0].name,
      });
    }

    fetchReservedTableSchemas({
      connId: connId,
      wsId: wsId,
      includeLoading: false,
    });
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
    fetchReservedTableSchemas,
  };
};
