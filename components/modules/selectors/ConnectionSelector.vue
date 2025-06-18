<script setup lang="ts">
import { Select, SelectGroup, SelectItem, SelectTrigger } from '#components';
import type { AcceptableValue } from 'reka-ui';
import { cn } from '@/lib/utils';
import { useAppContext } from '~/shared/contexts/useAppContext';
import type { Connection } from '~/shared/stores';
import CreateConnectionModal from '../management-connection/CreateConnectionModal.vue';
import { getDatabaseSupportByType } from '../management-connection/constants';

const {
  connectionStore,
  setConnectionId,
  onCreateNewConnection,
  onConnectToConnection,
  wsStateStore,
} = useAppContext();

const { connectionId: activeConnectionId } = toRefs(wsStateStore);

const { connectionsByWsId, selectedConnection } = toRefs(connectionStore);

const props = defineProps<{ class: string }>();

const open = ref(false);

const onChangeConnection = async (connectionId: AcceptableValue) => {
  if (
    typeof connectionId === 'string' &&
    connectionId !== activeConnectionId.value
  ) {
    await setConnectionId(connectionId);
  }
};

const isModalCreateConnectionOpen = ref(false);

const handleAddConnection = (connection: Connection) => {
  onCreateNewConnection(connection);
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
  />

  <Select
    @update:model-value="onChangeConnection"
    :model-value="activeConnectionId"
    v-model:open="open"
  >
    <SelectTrigger :class="cn(props.class, 'w-48 cursor-pointer')" size="sm">
      <div
        class="flex items-center gap-2 w-44 truncate"
        v-if="selectedConnection"
      >
        <component
          :is="getDatabaseSupportByType(selectedConnection.type)?.icon"
          class="size-4! min-w-4!"
        />
        {{ selectedConnection?.name }}
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
