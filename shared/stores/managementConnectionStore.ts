import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { EDatabaseType } from '~/components/modules/connection/constants';
import type { EConnectionMethod } from '~/components/modules/connection/type';
import { useWSStateStore } from './useWSStateStore';

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
  createdAt: string;
  updatedAt?: string;
}

export const useManagementConnectionStore = defineStore(
  'management-connection',
  () => {
    const wsStateStore = useWSStateStore();
    const { workspaceId, connectionId } = toRefs(wsStateStore);

    const connections = ref<Connection[]>([]);

    const selectedConnection = computed(() => {
      return connections.value.find(
        connection => connection.id === connectionId.value
      );
    });

    const currentConnectionString = computed(
      () => selectedConnection?.value?.connectionString
    );

    const createNewConnection = async (connection: Connection) => {
      connections.value.push(connection);

      await window.connectionApi.create(connection);
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

    const getConnectionsByWorkspaceId = (workspaceId: string) => {
      return connections.value.filter(
        connection => connection.workspaceId === workspaceId
      );
    };

    const loadPersistData = async () => {
      const load = await window.connectionApi.getAll();
      connections.value = load;
    };

    loadPersistData();

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
  },
  {
    persist: false,
  }
);
