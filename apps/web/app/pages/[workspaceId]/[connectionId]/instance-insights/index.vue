<script setup lang="ts">
import { InstanceInsightsHost } from '~/components/modules/instance-insights';
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';

definePageMeta({
  keepalive: true,
});

const route = useRoute();
const connectionStore = useManagementConnectionStore();

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
</script>

<template>
  <InstanceInsightsHost :connection="connectionData" />
</template>
