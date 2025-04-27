<script setup lang="ts">
import { Select, SelectGroup, SelectItem, SelectTrigger } from '#components';
import type { AcceptableValue } from 'reka-ui';
import { cn } from '@/lib/utils';
import { useManagementConnectionStore } from '~/shared/stores/managementConnectionStore';
import { getDatabaseSupportByType } from '../management-connection/constants';

const connectionStore = useManagementConnectionStore();
const { connections, selectedConnection } = toRefs(connectionStore);

const props = defineProps<{ class: string }>();

const onChangeConnection = async (connectionId: AcceptableValue) => {
  if (typeof connectionId === 'string') {
    connectionStore.setSelectedConnection(connectionId);
  }

  const url = connectionStore.selectedConnection?.connectionString;

  if (!url) return;

  const schemas = await $fetch('/api/get-schemas', {
    method: 'POST',
    body: {
      connectionUrl: url,
    },
  });
  const databases = await $fetch('/api/get-database-names', {
    method: 'POST',
    body: {
      connectionUrl: url,
    },
  });

  console.log('schemas', schemas);
  console.log('databases', databases);
};
</script>
<template>
  <Select
    @update:model-value="onChangeConnection"
    :model-value="selectedConnection?.id"
  >
    <SelectTrigger :class="cn(props.class, 'w-48 h-8! cursor-pointer')">
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
