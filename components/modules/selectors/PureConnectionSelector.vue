<script setup lang="ts">
import { Select, SelectGroup, SelectItem, SelectTrigger } from '#components';
import { cn } from '@/lib/utils';
import { useAppContext } from '~/core/contexts/useAppContext';
import { type Connection } from '~/core/stores';
import CreateConnectionModal from '../management-connection/CreateConnectionModal.vue';
import { getDatabaseSupportByType } from '../management-connection/constants';

defineEmits<{
  (e: 'update:connectionId', connectionId: string): void;
}>();

const props = defineProps<{
  class: string;
  workspaceId: string;
  connectionId: string;
  connections: Connection[];
  connection?: Connection;
}>();

const open = ref(false);

const { createConnection } = useAppContext();

const isModalCreateConnectionOpen = ref(false);

const handleAddConnection = (connection: Connection) => {
  createConnection(connection);
};

const onOpenAddConnectionModal = () => {
  isModalCreateConnectionOpen.value = true;
  open.value = false;
};
</script>
<template>
  <CreateConnectionModal
    :open="isModalCreateConnectionOpen"
    :editing-connection="null"
    @update:open="isModalCreateConnectionOpen = $event"
    @addNew="handleAddConnection"
    :workspaceId="workspaceId"
  />

  <Select
    @update:model-value="$emit('update:connectionId', $event as string)"
    :model-value="connectionId"
    v-model:open="open"
  >
    <SelectTrigger
      :class="cn(props.class, ' w-fit max-w-[12rem] cursor-pointer')"
      size="sm"
    >
      <div class="flex items-center gap-2 truncate" v-if="connection">
        <component
          :is="getDatabaseSupportByType(connection.type)?.icon"
          class="size-4! min-w-4!"
        />
        {{ connection?.name }}
      </div>
      <div class="opacity-50" v-else>Select connection</div>
    </SelectTrigger>
    <SelectContent>
      <SelectGroup>
        <div
          class="flex px-2 py-0.5 h-8 hover:bg-muted rounded-md font-normal text-sm items-center gap-1 cursor-pointer"
          @click="onOpenAddConnectionModal"
        >
          <Icon name="lucide:plus" />

          Add new connection
        </div>

        <SelectSeparator v-if="connections.length" />

        <SelectItem
          class="cursor-pointer"
          :value="connection.id"
          v-for="connection in connections"
        >
          <div class="flex items-center gap-2">
            <component
              :is="getDatabaseSupportByType(connection.type)?.icon"
              class="size-4!"
            />
            {{ connection.name }}
          </div>
        </SelectItem>
      </SelectGroup>
    </SelectContent>
  </Select>
</template>
