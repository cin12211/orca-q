<script setup lang="ts">
import { ref } from 'vue';
import { Button } from '@/components/ui/button';
import { useAppContext } from '~/shared/contexts/useAppContext';
import type { Connection } from '~/shared/stores/appState/interface';
import ConnectionsList from './ConnectionsList.vue';
import CreateConnectionModal from './CreateConnectionModal.vue';

const isModalOpen = ref(false);

const { onCreateNewConnection, connectionStore } = useAppContext();

const editingConnection = ref<Connection | null>(null);

const onOpenAddConnectionModal = () => {
  editingConnection.value = null;
  isModalOpen.value = true;
};

const handleAddConnection = (connection: Connection) => {
  onCreateNewConnection(connection);
};

const handleUpdateConnection = (connection: Connection) => {
  connectionStore.updateConnection(connection);
};

const onOpenUpdateConnectionModal = (connection: Connection) => {
  editingConnection.value = connection;
  isModalOpen.value = true;
};

const handleDeleteConnection = (id: string) => {
  console.log('🚀 ~ handleDeleteConnection ~ id:', id);

  connectionStore.onDeleteConnection(id);
};
</script>

<template>
  <div class="flex flex-col items-center">
    <div class="w-full">
      <div class="flex items-center justify-between rounded-md bg-card py-4">
        <div>
          <h1 class="text-xl font-medium">Management Connections</h1>
          <p class="text-muted-foreground">
            Manage your database connections in one place
          </p>
        </div>
        <Button @click="onOpenAddConnectionModal">
          <Icon name="lucide:plus" class="size-4!" />
          Add Connection
        </Button>
      </div>

      <ConnectionsList
        :connections="connectionStore.connections"
        @edit="onOpenUpdateConnectionModal"
        @delete="handleDeleteConnection"
      />

      <CreateConnectionModal
        :open="isModalOpen"
        :editing-connection="editingConnection"
        @update:open="isModalOpen = $event"
        @addNew="handleAddConnection"
        @update="handleUpdateConnection"
      />
    </div>
  </div>
</template>
