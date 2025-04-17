<template>
  <div class="flex min-h-screen flex-col items-center p-4 pt-8">
    <div class="w-full max-w-6xl space-y-6">
      <div
        class="flex items-center justify-between rounded-md border border-border bg-card p-4"
      >
        <div>
          <h1 class="text-xl font-medium">Database Connections</h1>
          <p class="text-muted-foreground">
            Manage your database connections in one place
          </p>
        </div>
        <Button @click="openAddConnectionModal">
          <PlusIcon class="h-4 w-4" />
          Add Connection
        </Button>
      </div>

      <ConnectionsList
        :connections="data.connections"
        @edit="handleEditConnection"
        @delete="handleDeleteConnection"
      />

      <CreateConnectionModal
        :open="isModalOpen"
        :editing-connection="data.editingConnection"
        @update:open="isModalOpen = $event"
        @save="handleAddConnection"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { PlusIcon } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import ConnectionsList from './ConnectionsList.vue';
import CreateConnectionModal from './CreateConnectionModal.vue';
import { useManagementConnectionStore } from './managementConnectionStore';
import type { DatabaseConnection } from './type/index';

const isModalOpen = ref(false);

const data = useManagementConnectionStore();

const openAddConnectionModal = () => {
  data.editingConnection = null;
  isModalOpen.value = true;
};

const handleAddConnection = (connection: DatabaseConnection) => {
  if (data.editingConnection) {
    data.connections = data.connections.map(c =>
      c.id === data.editingConnection?.id ? connection : c
    );
    data.editingConnection = null;
  } else {
    data.connections = [...data.connections, connection];
  }
};

const handleEditConnection = (connection: DatabaseConnection) => {
  data.editingConnection = connection;
  isModalOpen.value = true;
};

const handleDeleteConnection = (id: string) => {
  data.connections = data.connections.filter(c => c.id !== id);
};
</script>
