<script setup lang="ts">
import type { Connection } from '~/core/stores';
import type { TabView } from '~/core/stores/useTabViewsStore';
import RedisPubSubPanel from '../components/RedisPubSubPanel.vue';
import { useRedisWorkspace } from '../hooks/useRedisWorkspace';

const props = defineProps<{
  connection?: Connection;
  tabInfo?: TabView;
}>();

const workspace = useRedisWorkspace({
  connection: () => props.connection,
  tabInfo: () => props.tabInfo,
  mode: 'pubsub',
});
const { databases, selectedDatabaseIndex } = workspace;
</script>

<template>
  <RedisPubSubPanel
    :connection="props.connection"
    :database-index="selectedDatabaseIndex"
    :databases="databases"
    @update:database-index="workspace.selectedDatabaseIndex.value = $event"
  />
</template>
