<script setup lang="ts">
import { useTabManagement } from '~/core/composables/useTabManagement';
import { useWorkspaceConnectionRoute } from '~/core/composables/useWorkspaceConnectionRoute';
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';
import { EConnectionProviderKind } from '~/core/types/entities/connection.entity';
import { ManagementSidebarHeader } from '../shared';

const connectionStore = useManagementConnectionStore();
const { openDatabaseToolsTab, openInstanceInsightsTab, openSchemaDiffTab } =
  useTabManagement();
const { connectionId, workspaceId } = useWorkspaceConnectionRoute();

// Get the database connection
const connectionData = computed(() => {
  if (!connectionId.value) return null;
  return connectionStore.connections.find(c => c.id === connectionId.value);
});

const hasConnection = computed(() => Boolean(connectionData.value));

const databaseName = computed(
  () =>
    connectionData.value?.database || connectionData.value?.name || 'database'
);

const isManagedSqliteLimited = computed(() => {
  return (
    connectionData.value?.providerKind ===
      EConnectionProviderKind.CLOUDFLARE_D1 ||
    connectionData.value?.providerKind === EConnectionProviderKind.TURSO
  );
});

const unavailableReason = computed(() => {
  if (
    connectionData.value?.providerKind === EConnectionProviderKind.CLOUDFLARE_D1
  ) {
    return 'Cloudflare D1 stays on the SQL path, but backup, instance insight, and schema diff are not available for the managed provider transport.';
  }

  if (connectionData.value?.providerKind === EConnectionProviderKind.TURSO) {
    return 'Turso stays on the SQL path, but backup, instance insight, and schema diff are not available for the managed provider transport.';
  }

  return '';
});

// Open database tools in a new tab
const openDatabaseTools = async () => {
  await openDatabaseToolsTab({
    databaseName: databaseName.value,
  });
};
</script>

<template>
  <div class="flex flex-col h-full w-full overflow-hidden">
    <ManagementSidebarHeader
      title="Database Tools"
      :show-connection="true"
      :workspace-id="workspaceId"
    />

    <!-- No Connection State -->
    <BaseEmpty
      v-if="!hasConnection"
      title="Select a connection"
      icon="hugeicons:plug-socket"
    />

    <!-- Content -->
    <div v-else class="flex-1 overflow-y-auto px-3 pb-4">
      <!-- Tools List -->
      <div class="space-y-2 mt-3">
        <!-- Dump & Restore -->
        <button
          class="w-full flex items-center gap-3 rounded-lg border bg-background p-3 text-left transition-colors hover:bg-muted/20 cursor-pointer"
          :disabled="isManagedSqliteLimited"
          @click="openDatabaseTools()"
        >
          <Button size="iconMd" variant="outline">
            <Icon name="hugeicons:database-import" />
          </Button>

          <div class="flex-1">
            <p class="text-sm font-medium">Backup &amp; Restore</p>
            <p class="text-xs text-muted-foreground">
              Export and restore database backups
            </p>
          </div>
          <Icon
            name="hugeicons:external-link-01"
            class="size-4 text-muted-foreground"
          />
        </button>

        <!-- Instance Insight -->
        <button
          class="w-full flex items-center gap-3 rounded-lg border bg-background p-3 text-left transition-colors hover:bg-muted/20 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          :disabled="!hasConnection || isManagedSqliteLimited"
          @click="openInstanceInsightsTab({ databaseName })"
        >
          <Button size="iconMd" variant="outline">
            <Icon name="hugeicons:activity-02" />
          </Button>

          <div class="flex-1">
            <p class="text-sm font-medium">Instance Insight</p>
            <p class="text-xs text-muted-foreground">
              Monitor activity &amp; health
            </p>
          </div>
          <Icon
            name="hugeicons:external-link-01"
            class="size-4 text-muted-foreground"
          />
        </button>

        <!-- Schema Diff -->
        <button
          class="w-full flex items-center gap-3 rounded-lg border bg-background p-3 text-left transition-colors hover:bg-muted/20 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          :disabled="!hasConnection || isManagedSqliteLimited"
          @click="openSchemaDiffTab()"
        >
          <Button size="iconMd" variant="outline">
            <Icon name="hugeicons:git-compare" />
          </Button>

          <div class="flex-1">
            <p class="text-sm font-medium">Schema Diff</p>
            <p class="text-xs text-muted-foreground">
              Compare &amp; sync schemas between connections
            </p>
          </div>
          <Icon
            name="hugeicons:external-link-01"
            class="size-4 text-muted-foreground"
          />
        </button>

        <BaseNotice v-if="isManagedSqliteLimited" variant="secondary">
          {{ unavailableReason }}
        </BaseNotice>
      </div>
    </div>
  </div>
</template>
