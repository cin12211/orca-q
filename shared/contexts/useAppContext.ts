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

    const connectionUrl = connection.connectionString;

    const schemas = await $fetch('/api/get-schemas', {
      method: 'POST',
      body: {
        connectionUrl,
      },
    });

    const mappedSchemas: Schema[] = schemas.map((schema: Schema) => {
      return {
        connectionId: connection.id,
        workspaceId: connection.workspaceId,
        name: schema.name,
        entities: schema?.entities || [],
        tables: schema?.tables || [],
        views: schema?.views || [],
        functions: schema?.functions || [],
      };
    });

    schemaStore.updateSchemas(mappedSchemas);
  };

  return {
    onSelectWorkspaceById,
    workspaceStore,
    connectionStore,
    schemaStore,
    onCreateNewConnection,
  };
};
