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
  const { wsState, workspaceId, connectionId } = toRefs(wsStateStore);
  const { connectionsByWsId } = toRefs(connectionStore);
  const { schemas } = toRefs(schemaStore);

  const onCreateNewConnection = async (connection: Connection) => {
    console.log('🚀 ~ onCreateNewConnection ~ connection:', connection);

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

  const onConnectToConnection = async (connectionId: string) => {
    const connection = connectionsByWsId.value.find(
      connection => connection.id === connectionId
    );

    if (!connection) {
      throw new Error('No connection found');
      return;
    }

    const dbConnectionString: string = connection.connectionString || '';

    const databaseSource = await fetchCurrentSchema(dbConnectionString);
    console.log('🚀 ~ onConnectToConnection ~ databaseSource:', databaseSource);

    let includedPublic = false;

    databaseSource.forEach(schema => {
      const isExitSchema = schemas.value.find(
        e =>
          e.connectionId === connectionId &&
          e.workspaceId === wsState.value?.id &&
          e.name === schema.name
      );

      if (schema.name === PUBLIC_SCHEMA_ID) {
        includedPublic = true;
      }

      if (!isExitSchema) {
        schemas.value.push({
          workspaceId: wsState.value?.id || '',
          connectionId: connectionId,
          name: schema.name,
          functions: schema.functions || [],
          tables: schema.tables || [],
          views: schema.views || [],
          tableDetails: schema?.table_details || null,
        });
      }
    });

    const currentState = wsStateStore.getStateById({
      workspaceId: wsState.value?.id || '',
      connectionId,
    });

    const currentSchema = currentState?.connectionStates?.find(
      connectionState => connectionState.id === connectionId
    );

    if (!currentSchema?.schemaId) {
      await wsStateStore.setSchemaId({
        connectionId,
        workspaceId: workspaceId.value || '',
        schemaId: includedPublic ? PUBLIC_SCHEMA_ID : databaseSource[0].name,
      });
    }
  };

  const setConnectionId = async ({
    connectionId,
    onSuccess,
  }: {
    connectionId: string;
    onSuccess?: () => Promise<void>;
  }) => {
    if (!workspaceId.value) {
      throw new Error('No workspace selected');
      return;
    }

    await wsStateStore.setConnectionId({
      connectionId,
      workspaceId: workspaceId.value,
    });

    await workspaceStore.updateLastOpened(workspaceId.value);

    await onConnectToConnection(connectionId);

    await onSuccess?.();
  };

  return {
    setConnectionId,
    workspaceStore,
    connectionStore,
    onCreateNewConnection,
    wsState,
    setActiveWSId: wsStateStore.setActiveWSId,
    setSchemaId,
    onConnectToConnection,
    schemaStore,
    wsStateStore,
    tabViewStore,
  };
};
