<script setup lang="ts">
import { storeToRefs } from 'pinia';
import InstanceInsightsPanel from '~/components/modules/instance-insights/InstanceInsightsPanel.vue';
import RedisInstanceInsightsPanel from '~/components/modules/instance-insights/RedisInstanceInsightsPanel.vue';
import { useRedisWorkspace } from '~/components/modules/redis-workspace/hooks/useRedisWorkspace';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';
import { useTabViewsStore } from '~/core/stores/useTabViewsStore';

definePageMeta({
  keepalive: true,
});

const route = useRoute();
const connectionStore = useManagementConnectionStore();
const tabViewStore = useTabViewsStore();
const { activeTab } = storeToRefs(tabViewStore);

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

const databaseName = computed(() =>
  dbType.value === DatabaseClientType.REDIS
    ? connectionData.value?.name || 'Redis'
    : connectionData.value?.database || connectionData.value?.name || 'database'
);

const redisConnection = computed(() =>
  dbType.value === DatabaseClientType.REDIS
    ? (connectionData.value ?? undefined)
    : undefined
);
const redisWorkspace = useRedisWorkspace({
  connection: redisConnection,
  mode: 'meta',
});

watch(
  () => activeTab.value?.metadata?.databaseIndex,
  value => {
    if (typeof value === 'number') {
      redisWorkspace.selectedDatabaseIndex.value = value;
    }
  },
  { immediate: true }
);
</script>

<template>
  <div class="h-full">
    <div
      v-if="!connectionData"
      class="h-full p-4 flex flex-col items-center justify-center text-muted-foreground"
    >
      <Icon name="hugeicons:plug-socket" class="size-12 mb-2 opacity-50" />
      <p class="text-sm">Select a connection to open Instance Insights</p>
    </div>

    <RedisInstanceInsightsPanel
      v-else-if="dbType === DatabaseClientType.REDIS"
      :database-name="databaseName"
      :database-index="redisWorkspace.selectedDatabaseIndex.value"
      :databases="redisWorkspace.databases.value"
      :db-type="dbType"
      @update:database-index="
        redisWorkspace.selectedDatabaseIndex.value = $event
      "
    />

    <InstanceInsightsPanel
      v-else
      :db-connection-string="dbConnectionString"
      :database-name="databaseName"
      :db-type="dbType"
    />
  </div>
</template>
