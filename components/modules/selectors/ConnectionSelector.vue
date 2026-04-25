<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { Select, SelectGroup, SelectItem, SelectTrigger } from '#components';
import type { AcceptableValue } from 'reka-ui';
import {
  EnvTagBadge,
  useEnvironmentTagStore,
  useStrictModeGuard,
} from '@/components/modules/environment-tag';
import { cn } from '@/lib/utils';
import { useWorkspaceConnectionRoute } from '~/core/composables/useWorkspaceConnectionRoute';
import { useAppContext } from '~/core/contexts/useAppContext';
import { type Connection } from '~/core/stores';
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';
import { CreateConnectionModal } from '../connection';
import {
  getDatabaseSupportByType,
  isSqlite3ConnectionsEnabled,
  isSqliteConnectionDisabled,
} from '../connection';

const { createConnection, openWorkspaceWithConnection } = useAppContext();
const connectionStore = useManagementConnectionStore();
const tagStore = useEnvironmentTagStore();
const { checkAndConfirm } = useStrictModeGuard();
const config = useRuntimeConfig();

const { connectionId: activeConnectionId } = useWorkspaceConnectionRoute();

const { selectedConnection } = storeToRefs(connectionStore);

const props = defineProps<{ class: string; workspaceId: string }>();

const open = ref(false);
const sqlite3ConnectionsEnabled = computed(() =>
  isSqlite3ConnectionsEnabled(config.public.sqlite3ConnectionsEnabled)
);

const onChangeConnection = async (connectionId: AcceptableValue) => {
  if (
    typeof connectionId === 'string' &&
    connectionId !== activeConnectionId.value
  ) {
    const connection = connectionsByWsId.value.find(c => c.id === connectionId);
    if (
      connection &&
      isSqliteConnectionDisabled(connection, sqlite3ConnectionsEnabled.value)
    ) {
      return;
    }
    if (connection) {
      const ok = await checkAndConfirm(connection);
      if (!ok) return;
    }

    await openWorkspaceWithConnection({
      connId: connectionId,
      wsId: props.workspaceId,
    });

    // await setConnectionId({
    //   connectionId,
    //   async onSuccess() {
    //     await tabViewStore.onActiveCurrentTab(connectionId);
    //   },
    // });
  }
};

const isModalCreateConnectionOpen = ref(false);

const handleAddConnection = (connection: Connection) => {
  createConnection(connection);
};

const onOpenAddConnectionModal = () => {
  isModalCreateConnectionOpen.value = true;
  open.value = false;
};

const connectionsByWsId = computed(() => {
  return connectionStore.getConnectionsByWorkspaceId(props.workspaceId);
});

const selectedConnectionTags = computed(() => {
  return selectedConnection.value
    ? tagStore.getTagsByIds(selectedConnection.value.tagIds ?? [])
    : [];
});
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
    <SelectTrigger
      :class="cn(props.class, 'w-48 min-w-0 cursor-pointer')"
      size="sm"
    >
      <div
        class="flex min-w-0 flex-1 items-center gap-2 overflow-hidden"
        v-if="selectedConnection"
      >
        <component
          :is="getDatabaseSupportByType(selectedConnection.type)?.icon"
          class="size-4! min-w-4! flex-shrink-0"
        />
        <span class="min-w-0 truncate">{{ selectedConnection?.name }}</span>
        <div
          v-if="selectedConnectionTags.length"
          class="flex max-w-[45%] flex-shrink-0 items-center gap-1 overflow-hidden"
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

        <SelectSeparator v-if="connectionsByWsId.length" />

        <SelectItem
          class="cursor-pointer"
          :value="connection.id"
          :disabled="
            isSqliteConnectionDisabled(connection, sqlite3ConnectionsEnabled)
          "
          v-for="connection in connectionsByWsId"
        >
          <div class="flex items-center gap-2">
            <component
              :is="getDatabaseSupportByType(connection.type)?.icon"
              class="size-4!"
            />
            <span class="truncate">{{ connection.name }}</span>
            <div
              v-if="(connection.tagIds ?? []).length"
              class="flex items-center gap-1 ml-auto flex-shrink-0"
            >
              <EnvTagBadge
                v-for="tag in tagStore.getTagsByIds(connection.tagIds ?? [])"
                :key="tag.id"
                :tag="tag"
              />
            </div>
            <span
              v-if="
                isSqliteConnectionDisabled(
                  connection,
                  sqlite3ConnectionsEnabled
                )
              "
              class="ml-auto text-xs text-muted-foreground"
            >
              Disabled
            </span>
          </div>
        </SelectItem>
      </SelectGroup>
    </SelectContent>
  </Select>
</template>
