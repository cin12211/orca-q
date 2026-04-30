<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { useRedisWorkspace } from '~/components/modules/redis-workspace/hooks/useRedisWorkspace';
import { useTabManagement } from '~/core/composables/useTabManagement';
import { useWorkspaceConnectionRoute } from '~/core/composables/useWorkspaceConnectionRoute';
import { useManagementConnectionStore } from '~/core/stores';
import { TabViewType } from '~/core/stores/useTabViewsStore';
import { ManagementSidebarHeader } from '../shared';

const connectionStore = useManagementConnectionStore();
const { openInstanceInsightsTab, openRedisTab } = useTabManagement();
const { workspaceId } = useWorkspaceConnectionRoute();
const connection = computed(() => connectionStore.selectedConnection);
const workspace = useRedisWorkspace({ connection, mode: 'meta' });

const openPubSub = async () => {
  const connectionId = connection.value?.id || 'redis';
  await openRedisTab({
    id: `redis-pubsub-${connectionId}`,
    name: 'Redis Pub/Sub',
    type: TabViewType.RedisPubSub,
    metadata: {
      type: TabViewType.RedisPubSub,
      databaseIndex: workspace.selectedDatabaseIndex.value,
    },
  });
};

const openInstanceInsights = async () => {
  await openInstanceInsightsTab({
    databaseName: connection.value?.name || 'Redis',
    databaseIndex: workspace.selectedDatabaseIndex.value,
  });
};
</script>

<template>
  <div class="flex flex-col h-full w-full overflow-hidden">
    <ManagementSidebarHeader
      title="Redis Tools"
      :show-connection="true"
      :workspace-id="workspaceId"
    />

    <div class="flex-1 overflow-y-auto px-3 pb-4">
      <div class="space-y-2 mt-2">
        <button
          class="w-full flex items-center gap-3 rounded-lg border bg-background p-3 text-left hover:bg-muted/20 transition-colors cursor-pointer"
          @click="openInstanceInsights"
        >
          <Button size="iconMd" variant="outline">
            <Icon name="hugeicons:activity-02" />
          </Button>
          <div class="flex-1">
            <p class="text-sm font-medium">Redis Instance Insight</p>
            <p class="text-xs text-muted-foreground">
              Monitor Redis overview, memory, clients, persistence, and
              replication.
            </p>
          </div>
        </button>

        <button
          class="w-full flex items-center gap-3 rounded-lg border bg-background p-3 text-left hover:bg-muted/20 transition-colors cursor-pointer"
          @click="openPubSub"
        >
          <Button size="iconMd" variant="outline">
            <Icon name="hugeicons:radio" />
          </Button>
          <div class="flex-1">
            <p class="text-sm font-medium">Pub/Sub</p>
            <p class="text-xs text-muted-foreground">
              Subscribe to Redis channels, watch live messages, and publish test
              events.
            </p>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>
