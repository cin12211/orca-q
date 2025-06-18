<script setup lang="ts">
import { Select, SelectGroup, SelectItem, SelectTrigger } from '#components';
import { useAppContext } from '~/shared/contexts/useAppContext';
import { getDatabaseSupportByType } from '../management-connection/constants';

const { connectionStore, setConnectionId } = useAppContext();

const { connectionsByWsId, selectedConnection } = toRefs(connectionStore);
</script>
<template>
  <Select
    @update:model-value="
      e => {
        setConnectionId(e as string);
      }
    "
    :model-value="selectedConnection?.id"
  >
    <SelectTrigger class="w-48 h-8">
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
