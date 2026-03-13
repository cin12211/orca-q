<script setup lang="ts">
import InstanceInsightsPanel from '~/components/modules/instance-insights/InstanceInsightsPanel.vue';
import { useAppContext } from '~/core/contexts/useAppContext';

definePageMeta({
  keepalive: true,
});

const route = useRoute();
const { connectionStore } = useAppContext();

const connectionId = computed(() =>
  String(
    (route.params as Record<string, string | number | undefined>)
      .connectionId || ''
  )
);

const connectionData = computed(() => {
  if (!connectionId.value) return null;
  return connectionStore.connections.find(
    conn => conn.id === connectionId.value
  );
});

const dbConnectionString = computed(
  () => connectionData.value?.connectionString || ''
);

const dbType = computed(() => connectionData.value?.type);

const databaseName = computed(
  () =>
    connectionData.value?.database || connectionData.value?.name || 'database'
);
</script>

<template>
  <div class="h-full">
    <div
      v-if="!dbConnectionString"
      class="h-full p-4 flex flex-col items-center justify-center text-muted-foreground"
    >
      <Icon name="hugeicons:plug-socket" class="size-12 mb-2 opacity-50" />
      <p class="text-sm">Select a connection to open Instance Insights</p>
    </div>

    <InstanceInsightsPanel
      v-else
      :db-connection-string="dbConnectionString"
      :database-name="databaseName"
      :db-type="dbType"
    />
  </div>
</template>
