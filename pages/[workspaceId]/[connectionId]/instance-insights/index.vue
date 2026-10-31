<script setup lang="ts">
import { storeToRefs } from 'pinia';
import type { Component } from 'vue';
import GenericSqlInstanceInsightsPanel from '~/components/modules/instance-insights/GenericSqlInstanceInsightsPanel.vue';
import PostgresInstanceInsightsPanel from '~/components/modules/instance-insights/PostgresInstanceInsightsPanel.vue';
import { KafkaInstanceInsightsPanel } from '~/components/modules/kafka-workspace';
import { RabbitInstanceInsightsPanel } from '~/components/modules/rabbitmq-workspace';
import { RedisInstanceInsightsPanel } from '~/components/modules/redis-workspace/containers';
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

const sqlPanelProps = computed(() => ({
  dbConnectionString: dbConnectionString.value,
  databaseName: databaseName.value,
  dbType: dbType.value,
}));

const brokerPanelProps = computed(() => ({
  connection: connectionData.value,
}));

const redisPanelProps = computed(() => ({
  databaseName: databaseName.value,
  databaseIndex: redisWorkspace.selectedDatabaseIndex.value,
  databases: redisWorkspace.databases.value,
  dbType: dbType.value,
  'onUpdate:databaseIndex': (value: number) => {
    redisWorkspace.selectedDatabaseIndex.value = value;
  },
}));

interface InsightsPanel {
  is: Component;
  props: Record<string, unknown>;
}

const panel = computed<InsightsPanel>(() => {
  switch (dbType.value) {
    case DatabaseClientType.REDIS:
      return { is: RedisInstanceInsightsPanel, props: redisPanelProps.value };
    case DatabaseClientType.RABBITMQ:
      return { is: RabbitInstanceInsightsPanel, props: brokerPanelProps.value };
    case DatabaseClientType.KAFKA:
      return { is: KafkaInstanceInsightsPanel, props: brokerPanelProps.value };
    case DatabaseClientType.POSTGRES:
      return { is: PostgresInstanceInsightsPanel, props: sqlPanelProps.value };
    default:
      return {
        is: GenericSqlInstanceInsightsPanel,
        props: sqlPanelProps.value,
      };
  }
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

    <component :is="panel.is" v-else v-bind="panel.props" />
  </div>
</template>
