import { ref } from "vue";
import { defineStore } from "pinia";
import type { DatabaseConnection } from "./type"; // adjust the path

export const useManagementConnectionStore = defineStore(
  "management-connection",
  () => {
    const connections = ref<DatabaseConnection[]>([]);
    const editingConnection = ref<DatabaseConnection | null>(null);
    const isModalOpen = ref(false);

    const openAddConnectionModal = () => {
      editingConnection.value = null;
      isModalOpen.value = true;
    };

    const handleAddConnection = (connection: DatabaseConnection) => {
      if (editingConnection.value) {
        connections.value = connections.value.map((c) =>
          c.id === editingConnection.value?.id ? connection : c
        );
        editingConnection.value = null;
      } else {
        connections.value = [...connections.value, connection];
      }
      isModalOpen.value = false;
    };

    const handleEditConnection = (connection: DatabaseConnection) => {
      editingConnection.value = connection;
      isModalOpen.value = true;
    };

    const handleDeleteConnection = (id: string) => {
      connections.value = connections.value.filter((c) => c.id !== id);
    };

    return {
      connections,
      editingConnection,
      isModalOpen,
      openAddConnectionModal,
      handleAddConnection,
      handleEditConnection,
      handleDeleteConnection,
    };
  },
  {
    persist: true,
  }
);
