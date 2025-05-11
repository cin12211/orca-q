import { useSchemaStore, useWorkspacesStore } from '../stores';
import type { Connection, Schema } from '../stores/appState/interface';
import { useManagementConnectionStore } from '../stores/managementConnectionStore';

export const useAppContext = () => {
  const workspaceStore = useWorkspacesStore();

  const connectionStore = useManagementConnectionStore();

  const schemaStore = useSchemaStore();

  const onSelectWorkspaceById = (workspaceId: string) => {
    //select workspace
    workspaceStore.setSelectedWorkspaceId(workspaceId);
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

    const currentConnectionId = connectionStore.selectedConnectionId;
    const currentConnection = connectionStore.selectedConnection;

    if (!currentConnectionId) {
      // set first connection as selected
      connectionStore.setSelectedConnection(connections[0].id);
    }

    // select public or first schema
    if (!currentConnection) {
      return;
    }

    schemaStore.setInitialSchema();
  };

  const onCreateNewConnection = async (connection: Connection) => {
    connectionStore.createNewConnection(connection);

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

    // auto select when user have empty schema or connection
    if (!schemaStore.currentSchema || !connectionStore.selectedConnectionId) {
      onSelectConnectionById(connection.id);
    }
  };

  const onSelectConnectionById = (connectionId: string) => {
    connectionStore.setSelectedConnection(connectionId);
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
  };
};
