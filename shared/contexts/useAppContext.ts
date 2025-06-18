import { useSchemaStore, useWorkspacesStore, useWSStateStore } from '../stores';
import type { Schema } from '../stores';
import {
  useManagementConnectionStore,
  type Connection,
} from '../stores/managementConnectionStore';

export const useAppContext = () => {
  const workspaceStore = useWorkspacesStore();

  const connectionStore = useManagementConnectionStore();

  const schemaStore = useSchemaStore();

  const wsStateStore = useWSStateStore();
  const { wsState, schemaId: _schemaId } = toRefs(wsStateStore);

  const workspaceId = computed(() => wsState.value?.id);
  const connectionId = computed(() => wsState.value?.connectionId);
  const schemaId = computed(() => _schemaId);

  const onSelectWorkspaceById = (workspaceId: string) => {
    //select workspace
    wsStateStore.setActiveWSId(workspaceId);
    const currentWorkspace = workspaceStore.selectedWorkspace;

    if (!currentWorkspace) {
      return;
    }

    // then select first connection
    const connections =
      connectionStore.getConnectionsByWorkspaceId(workspaceId);

    if (!connections.length) {
      return;
    }

    const currentConnectionId = wsState.value?.connectionId;
    const currentConnection = connectionStore.selectedConnection;

    if (!currentConnectionId) {
      // set first connection as selected

      wsStateStore.setConnectionId({
        connectionId: connections[0].id,
        workspaceId,
      });
    }

    // select public or first schema
    if (!currentConnection) {
      return;
    }

    schemaStore.setInitialSchema();
  };

  const onCreateNewConnection = async (connection: Connection) => {
    console.log('🚀 ~ onCreateNewConnection ~ connection:', connection);

    await connectionStore.createNewConnection(connection);

    console.log('hello');

    const dbConnectionString = connection.connectionString;

    const databaseSource = await $fetch('/api/get-database-source', {
      method: 'POST',
      body: {
        dbConnectionString,
      },
    });

    const mappedSchemas: Schema[] = databaseSource.map(schema => {
      return {
        connectionId: connection.id,
        workspaceId: connection.workspaceId,
        name: schema.name,
        tableDetails: schema?.table_details || null,
        tables: schema?.tables || [],
        views: schema?.views || [],
        functions: schema?.functions || [],
      };
    });

    schemaStore.updateSchemasForWorkspace({
      newSchemas: mappedSchemas,
      connectionId: connection.id,
    });

    console.log('cin');
    // auto select when user have empty schema or connection
    if (!schemaStore.currentSchema || !wsState.value?.connectionId) {
      onSelectConnectionById(connection.id);
    }
  };

  const setConnectionId = (connectionId: string) => {
    if (!workspaceId.value) {
      throw new Error('No workspace selected');
      return;
    }

    wsStateStore.setConnectionId({
      connectionId,
      workspaceId: workspaceId.value,
    });
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

  const onSelectConnectionById = (connectionId: string) => {
    setConnectionId(connectionId);
    schemaStore.setInitialSchema();
  };

  const currentConnectionString = computed(
    () => connectionStore.selectedConnection?.connectionString
  );

  return {
    onSelectWorkspaceById,
    onSelectConnectionById,
    workspaceStore,
    connectionStore,
    schemaStore,
    onCreateNewConnection,
    currentConnectionString,
    wsState,
    workspaceId,
    connectionId,
    schemaId,
    setActiveWSId: wsStateStore.setActiveWSId,
    setConnectionId,
    setSchemaId,
  };
};
