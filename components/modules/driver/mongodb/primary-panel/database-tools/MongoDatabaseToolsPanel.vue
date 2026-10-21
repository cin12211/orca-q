<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { PrimaryPanelHeader } from '~/components/modules/driver/shared/primary-panel/shared';
import { useTabManagement } from '~/core/composables/useTabManagement';
import { useWorkspaceConnectionRoute } from '~/core/composables/useWorkspaceConnectionRoute';
import { useManagementConnectionStore } from '~/core/stores';

const connectionStore = useManagementConnectionStore();
const { openInstanceInsightsTab } = useTabManagement();
const { workspaceId } = useWorkspaceConnectionRoute();
const connection = computed(() => connectionStore.selectedConnection);

const openInstanceInsights = async () => {
  await openInstanceInsightsTab({
    databaseName: connection.value?.name || 'MongoDB',
  });
};
</script>

<template>
  <div class="flex flex-col h-full w-full overflow-hidden">
    <PrimaryPanelHeader
      title="MongoDB Tools"
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
            <p class="text-sm font-medium">Instance Insights</p>
            <p class="text-xs text-muted-foreground">
              Monitor MongoDB version, uptime, topology, connections, memory,
              and cache usage.
            </p>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>
