import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Connection } from './appState/interface';

export const useManagementConnectionStore = defineStore(
  'management-connection',
  () => {
    const connections = ref<Connection[]>([]);
    const selectedConnectionId = ref<string>();

    const onDeleteConnection = (id: string) => {
      connections.value = connections.value.filter(c => c.id !== id);
    };

    const createNewConnection = (connection: Connection) => {
      connections.value.push(connection);
    };

    const updateConnection = (connection: Connection) => {
      connections.value = connections.value.map(c =>
        c.id === connection.id ? connection : c
      );
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
    persist: true,
  }
);
