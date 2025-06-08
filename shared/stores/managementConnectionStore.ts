import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { EDatabaseType } from '~/components/modules/management-connection/constants';
import type { EConnectionMethod } from '~/components/modules/management-connection/type';
import { useWorkspacesStore } from './useWorkspacesStore';

export interface Connection {
  workspaceId: string;
  id: string;
  name: string;
  type: EDatabaseType;
  method: EConnectionMethod;
  connectionString?: string;
  host?: string;
  port?: string;
  username?: string;
  password?: string;
  database?: string;
  createdAt: Date;
}

export const useManagementConnectionStore = defineStore(
  'management-connection',
  () => {
    const workspaceStore = useWorkspacesStore();

    const connections = ref<Connection[]>([]);
    const selectedConnectionId = ref<string>();

    const createNewConnection = async (connection: Connection) => {
      await window.connectionApi.create(connection);

      connections.value.push(connection);
    };

    const updateConnection = async (connection: Connection) => {
      await window.connectionApi.update(connection);
      await loadPersistData();

      // connections.value = connections.value.map(c =>
      //   c.id === connection.id ? connection : c
      // );
    };

    const onDeleteConnection = async (id: string) => {
      await window.connectionApi.delete(id);
      await loadPersistData();

      // connections.value = connections.value.filter(c => c.id !== id);
    };

    const setSelectedConnection = (id: string) => {
      selectedConnectionId.value = id;
    };

    const selectedConnection = computed(() => {
      return connections.value.find(
        connection => connection.id === selectedConnectionId.value
      );
    });

    const getConnectionsByWorkspaceId = (workspaceId: string) => {
      return connections.value.filter(
        connection => connection.workspaceId === workspaceId
      );
    };

    const loadPersistData = async () => {
      if (!workspaceStore.selectedWorkspaceId) {
        return;
      }

      console.time('loadPersistData');
      const load = await window.connectionApi.getByWorkspaceId(
        workspaceStore.selectedWorkspaceId
      );
      connections.value = load;
      console.timeEnd('loadPersistData');
    };

    loadPersistData();

    watch(
      () => workspaceStore.selectedWorkspaceId,
      () => {
        loadPersistData();
      }
    );

    return {
      connections,
      updateConnection,
      createNewConnection,
      onDeleteConnection,
      selectedConnection,
      setSelectedConnection,
      selectedConnectionId,
      getConnectionsByWorkspaceId,
    };
  },
  {
    persist: false,
  }
);
