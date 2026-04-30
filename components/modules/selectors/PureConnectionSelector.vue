<script setup lang="ts">
import { Select, SelectGroup, SelectItem, SelectTrigger } from '#components';
import {
  EnvTagBadge,
  useEnvironmentTagStore,
} from '@/components/modules/environment-tag';
import { cn } from '@/lib/utils';
import { useAppContext } from '~/core/contexts/useAppContext';
import { type Connection } from '~/core/stores';
import { CreateConnectionModal } from '../connection';
import {
  getDatabaseSupportByType,
  isSqlite3ConnectionsEnabled,
  isSqliteConnectionDisabled,
} from '../connection';

const emit = defineEmits<{
  (e: 'update:connectionId', connectionId: string): void;
}>();

const props = defineProps<{
  class: string;
  workspaceId: string;
  connectionId: string;
  disabled?: boolean;
  connections: Connection[];
  connection?: Connection;
  skipStrictModeConnections?: boolean;
}>();

const open = ref(false);

const { createConnection } = useAppContext();
const tagStore = useEnvironmentTagStore();
const config = useRuntimeConfig();

const isModalCreateConnectionOpen = ref(false);
const sqlite3ConnectionsEnabled = computed(() =>
  isSqlite3ConnectionsEnabled(config.public.sqlite3ConnectionsEnabled)
);

const handleAddConnection = (connection: Connection) => {
  createConnection(connection);
};

const onOpenAddConnectionModal = () => {
  isModalCreateConnectionOpen.value = true;
  open.value = false;
};

const getConnectionTags = (connection: Connection) => {
  return tagStore.getTagsByIds(connection.tagIds ?? []);
};

const isStrictModeConnection = (connection: Connection) => {
  return getConnectionTags(connection).some(tag => tag.strictMode);
};

const isConnectionDisabled = (connection: Connection) => {
  return (
    (!props.skipStrictModeConnections && isStrictModeConnection(connection)) ||
    isSqliteConnectionDisabled(connection, sqlite3ConnectionsEnabled.value)
  );
};

const onChangeConnection = (connectionId: string) => {
  if (props.disabled) {
    return;
  }

  const targetConnection = props.connections.find(
    connection => connection.id === connectionId
  );

  if (!targetConnection || isConnectionDisabled(targetConnection)) {
    return;
  }

  emit('update:connectionId', connectionId);
};

const selectedConnectionTags = computed(() => {
  return props.connection
    ? tagStore.getTagsByIds(props.connection.tagIds ?? [])
    : [];
});

const getConnectionSupportIcon = (connection?: Connection) => {
  return connection ? getDatabaseSupportByType(connection.type)?.icon : null;
};

const getConnectionSupportIconType = (connection?: Connection) => {
  return getConnectionSupportIcon(connection)?.type;
};

const getConnectionSupportIconProps = (connection?: Connection) => {
  return (getConnectionSupportIcon(connection)?.props ?? {}) as Record<
    string,
    unknown
  >;
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
    @update:model-value="onChangeConnection($event as string)"
    :model-value="connectionId"
    :disabled="disabled"
    v-model:open="open"
  >
    <SelectTrigger
      :class="cn('cursor-pointer font-normal', props.class)"
      :disabled="disabled"
      size="sm"
    >
      <div class="flex items-center gap-2 truncate" v-if="connection">
        <component
          v-if="getConnectionSupportIconType(connection)"
          :is="getConnectionSupportIconType(connection)"
          v-bind="getConnectionSupportIconProps(connection)"
          class="size-4! min-w-4!"
        />
        <span class="truncate">{{ connection?.name }}</span>

        <div
          v-if="selectedConnectionTags.length"
          class="flex flex-shrink-0 items-center gap-1 overflow-hidden"
        >
          <EnvTagBadge
            v-for="tag in selectedConnectionTags"
            :key="tag.id"
            :tag="tag"
          />
        </div>
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
          :disabled="isConnectionDisabled(connection)"
          v-for="connection in connections"
        >
          <div class="flex items-center gap-2 w-full">
            <component
              v-if="getConnectionSupportIconType(connection)"
              :is="getConnectionSupportIconType(connection)"
              v-bind="getConnectionSupportIconProps(connection)"
              class="size-4!"
            />
            <span class="truncate">{{ connection.name }}</span>
            <div
              v-if="getConnectionTags(connection).length"
              class="flex items-center gap-1 ml-auto flex-shrink-0"
            >
              <EnvTagBadge
                v-for="tag in getConnectionTags(connection)"
                :key="tag.id"
                :tag="tag"
              />
            </div>
            <span
              v-if="isConnectionDisabled(connection)"
              class="text-xs text-muted-foreground"
            >
              {{
                isSqliteConnectionDisabled(
                  connection,
                  sqlite3ConnectionsEnabled
                )
                  ? 'Disabled'
                  : 'Not allowed'
              }}
            </span>
          </div>
        </SelectItem>
      </SelectGroup>
    </SelectContent>
  </Select>
</template>
