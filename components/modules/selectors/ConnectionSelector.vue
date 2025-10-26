<script setup lang="ts">
import { Select, SelectGroup, SelectItem, SelectTrigger } from '#components';
import type { AcceptableValue } from 'reka-ui';
import { cn } from '@/lib/utils';
import { useConnectionsService } from '~/shared/services/useConnectionService';
import { useWorkspacesService } from '~/shared/services/useWorkspacesService';
import { type Connection } from '~/shared/stores';
import CreateConnectionModal from '../connection/CreateConnectionModal.vue';
import {
  EDatabaseType,
  getDatabaseSupportByType,
} from '../connection/constants';

const route = useRoute('workspaceId-connectionId');

const activeConnectionId = computed(() => {
  return route.params.connectionId;
});

const { openWorkspace } = useWorkspacesService();
const { create: createConnection, connStore } = useConnectionsService();

const props = defineProps<{ class: string; workspaceId: string }>();

const open = ref(false);
const isModalCreateConnectionOpen = ref(false);

const currentConnection = computed(() => {
  return connStore.connectionById(activeConnectionId.value);
});

const connectionsByWsId = computed(() => {
  return connStore.connectionsByWorkspaceId(props.workspaceId);
});

const onChangeConnection = async (connectionId: AcceptableValue) => {
  if (
    typeof connectionId === 'string' &&
    connectionId !== activeConnectionId.value
  ) {
    await openWorkspace({
      connId: connectionId,
      wsId: props.workspaceId,
    });
  }
};

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
    @update:model-value="onChangeConnection"
    :model-value="activeConnectionId"
    v-model:open="open"
  >
    <SelectTrigger :class="cn(props.class, 'w-48 cursor-pointer')" size="sm">
      <div
        class="flex items-center gap-2 w-44 truncate"
        v-if="currentConnection"
      >
        <component
          :is="
            getDatabaseSupportByType(
              currentConnection.value?.type as EDatabaseType
            )?.icon
          "
          class="size-4! min-w-4!"
        />
        {{ currentConnection.value?.name }}
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

        <SelectSeparator v-if="connectionsByWsId.length" />

        <SelectItem
          class="cursor-pointer"
          :value="connection.id"
          v-for="connection in connectionsByWsId"
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
