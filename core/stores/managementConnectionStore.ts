import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import {
  EConnectionMethod,
  type ISSLConfig,
  type ISSHConfig,
} from '~/components/modules/connection';
import { useWorkspaceConnectionRoute } from '~/core/composables/useWorkspaceConnectionRoute';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { createStorageApis } from '~/core/storage';

export interface Connection {
  workspaceId: string;
  id: string;
  name: string;
  type: DatabaseClientType;
  method: EConnectionMethod;
  connectionString?: string;
  host?: string;
  port?: string;
  username?: string;
  password?: string;
  database?: string;
  ssl?: ISSLConfig;
  ssh?: ISSHConfig;
  tagIds?: string[];
  createdAt: string;
  updatedAt?: string;
}

export const useManagementConnectionStore = defineStore(
  'management-connection',
  () => {
    const storageApis = createStorageApis();
    const { workspaceId, connectionId } = useWorkspaceConnectionRoute();

    const connections = ref<Connection[]>([]);

    const selectedConnection = computed(() => {
      return connections.value.find(
        connection =>
          connection.id === connectionId.value &&
          connection.workspaceId === workspaceId.value
      );
    });

    const currentConnectionString = computed(
      () => selectedConnection?.value?.connectionString
    );

    const createNewConnection = async (connection: Connection) => {
      const created = await storageApis.connectionStorage.create(connection);
      connections.value.push(created);
    };

    const updateConnection = async (connection: Connection) => {
      const result = await storageApis.connectionStorage.update(connection);

      if (result) {
        // Happy path: entry existed in IDB — update the reactive array in-place
        const idx = connections.value.findIndex(c => c.id === connection.id);
        if (idx !== -1) {
          connections.value.splice(idx, 1, result);
        } else {
          connections.value.push(result);
        }
      } else {
        // Fallback: entry was not present in IDB yet (only in memory) — create it
        const created = await storageApis.connectionStorage.create(connection);
        if (created) {
          const idx = connections.value.findIndex(c => c.id === connection.id);
          if (idx !== -1) {
            connections.value.splice(idx, 1, created);
          } else {
            connections.value.push(created);
          }
        }
      }
    };

    const onDeleteConnection = async (id: string) => {
      await storageApis.connectionStorage.delete(id);
      await loadPersistData();

      // connections.value = connections.value.filter(c => c.id !== id);
    };

    const getConnectionsByWorkspaceId = (workspaceId: string) => {
      return connections.value.filter(
        connection => connection.workspaceId === workspaceId
      );
    };

    const loadPersistData = async () => {
      const load = await storageApis.connectionStorage.getAll();
      connections.value = load;
    };

    // loadPersistData();

    return {
      loadPersistData,
      updateConnection,
      createNewConnection,
      onDeleteConnection,
      getConnectionsByWorkspaceId,
      selectedConnection,
      currentConnectionString,
      connections,
    };
  }
);
