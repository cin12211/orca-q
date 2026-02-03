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
    if (!connectionStore.connections.length) {
      await connectionStore.loadPersistData();
    }

    const connectionsByWsId = connectionStore.getConnectionsByWorkspaceId(wsId);

    const connection = connectionsByWsId.find(
      connection => connection.id === connId
    );

    if (!connection) {
      throw new Error('No connection found');
    }

    includeLoading && start();

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
    const databaseSource = await $fetch('/api/get-schema-meta-data', {
      method: 'POST',
      body: {
        dbConnectionString,
      },
    });

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
      return;
    }

    if (isRefresh) {
      schemas.value = [...schemas.value].filter(
        schema => schema.connectionId !== connId
      );
    }

    const isExitSchema = schemas.value.some(
      schema => schema.connectionId === connId
    );

    let includedPublic = false;

    let databaseSource: SchemaMetaData[] = [];

    try {
      if (!isExitSchema || isRefresh) {
        const dbConnectionString: string = connection.connectionString || '';

        databaseSource = await fetchCurrentSchema(dbConnectionString);

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
              viewDetails: schema?.view_details || null,
            });
          }
        });
      }

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
          workspaceId: wsId,
          schemaId: includedPublic
            ? PUBLIC_SCHEMA_ID
            : databaseSource[0]?.name || PUBLIC_SCHEMA_ID,
        });
      }

      await fetchReservedTableSchemas({
        connId: connId,
        wsId: wsId,
        includeLoading: false,
      });
    } catch (e) {
      console.error(e);
    }

    finish();
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
    fetchReservedTableSchemas,
  };
};
