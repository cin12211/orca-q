<script setup lang="ts">
import { useAppContext } from '~/core/contexts/useAppContext';
import { TabViewType } from '~/core/stores/useTabViewsStore';
import ConnectionSelector from '../selectors/ConnectionSelector.vue';

const { wsStateStore, connectionStore, tabViewStore } = useAppContext();
const { connectionId, workspaceId } = toRefs(wsStateStore);

// Get the database connection
const connectionData = computed(() => {
  if (!connectionId.value) return null;
  return connectionStore.connections.find(c => c.id === connectionId.value);
});

const dbConnectionString = computed(
  () => connectionData.value?.connectionString || ''
);

const databaseName = computed(
  () =>
    connectionData.value?.database || connectionData.value?.name || 'database'
);

// Open database tools in a new tab
const openDatabaseTools = async (type: 'export' | 'import') => {
  if (!workspaceId.value || !connectionId.value) return;

  const tabId = `database-tools-${connectionId.value}`;

  await tabViewStore.openTab({
    workspaceId: workspaceId.value,
    connectionId: connectionId.value,
    schemaId: '',
    id: tabId,
    name: `${databaseName.value} - Tools`,
    icon: 'lucide:database',
    iconClass: 'text-primary',
    type: TabViewType.DatabaseTools,
    routeName: 'workspaceId-connectionId-quick-query-database-tools-name',
    routeParams: {
      workspaceId: workspaceId.value,
      connectionId: connectionId.value,
      name: type,
    },
  });

  await tabViewStore.selectTab(tabId);
};
</script>

<template>
  <div class="flex flex-col h-full w-full overflow-hidden">
    <!-- Connection Selector -->
    <div class="relative w-full items-center px-2 pt-1 space-y-1 shrink-0">
      <div>
        <p
          class="text-sm font-medium text-muted-foreground leading-none block pb-1"
        >
          Connections
        </p>
        <ConnectionSelector class="w-full!" :workspaceId="workspaceId" />
      </div>
    </div>

    <!-- Header -->
    <div class="px-3 pt-3 pb-2 shrink-0">
      <p class="text-sm font-medium text-muted-foreground leading-none">
        Database Tools
      </p>
    </div>

    <!-- No Connection State -->
    <div
      v-if="!dbConnectionString"
      class="flex-1 flex flex-col items-center justify-center text-muted-foreground px-4"
    >
      <Icon name="hugeicons:plug-socket" class="size-12 mb-2 opacity-50" />
      <p class="text-sm text-center">Select a connection</p>
    </div>

    <!-- Content -->
    <div v-else class="flex-1 overflow-y-auto px-3 pb-4">
      <!-- Database Info -->
      <div class="mb-4 p-3 bg-muted/30 rounded-lg">
        <div class="flex items-center gap-2">
          <Icon name="lucide:database" class="size-5 text-primary" />
          <div>
            <p class="text-sm font-medium">{{ databaseName }}</p>
            <p class="text-xs text-muted-foreground">Connected database</p>
          </div>
        </div>
      </div>

      <!-- Tools List -->
      <div class="space-y-2">
        <!-- Export -->
        <button
          class="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors text-left"
          @click="openDatabaseTools('export')"
        >
          <div class="p-2 rounded-md bg-blue-500/10">
            <Icon name="lucide:download" class="size-5 text-blue-500" />
          </div>
          <div class="flex-1">
            <p class="text-sm font-medium">Export Database</p>
            <p class="text-xs text-muted-foreground">
              Backup schema and data using pg_dump
            </p>
          </div>
          <Icon
            name="lucide:external-link"
            class="size-4 text-muted-foreground"
          />
        </button>

        <!-- Import -->
        <button
          class="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors text-left"
          @click="openDatabaseTools('import')"
        >
          <div class="p-2 rounded-md bg-green-500/10">
            <Icon name="lucide:upload" class="size-5 text-green-500" />
          </div>
          <div class="flex-1">
            <p class="text-sm font-medium">Import Database</p>
            <p class="text-xs text-muted-foreground">
              Restore from backup using pg_restore
            </p>
          </div>
          <Icon
            name="lucide:external-link"
            class="size-4 text-muted-foreground"
          />
        </button>
      </div>

      <!-- Info -->
      <div
        class="mt-4 p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground"
      >
        <div class="flex items-start gap-2">
          <Icon name="lucide:info" class="size-4 mt-0.5 shrink-0" />
          <div>
            <p class="font-medium">Requirements</p>
            <p class="mt-1">
              <code class="bg-muted px-1 rounded">pg_dump</code> and
              <code class="bg-muted px-1 rounded">pg_restore</code> must be
              installed on the server.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
