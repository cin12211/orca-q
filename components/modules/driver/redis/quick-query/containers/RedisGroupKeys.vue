<script setup lang="ts">
import type { Connection } from '~/core/stores';
import type { TabView } from '~/core/stores/useTabViewsStore';
import RedisGroupOverview from '../components/RedisGroupOverview.vue';
import { useRedisGroupItems } from '../hooks/useRedisGroupItems';
import { useRedisWorkspace } from '../hooks/useRedisWorkspace';

const props = defineProps<{
  connection?: Connection;
  tabInfo?: TabView;
}>();

const workspace = useRedisWorkspace({
  connection: () => props.connection,
  tabInfo: () => props.tabInfo,
  mode: 'group',
});

const prefix = computed<string>(() => props.tabInfo?.metadata?.prefix ?? '');

const { items, loading } = useRedisGroupItems({
  prefix,
  databaseIndex: workspace.selectedDatabaseIndex,
  listGroupKeys: workspace.listGroupKeys,
});
</script>

<template>
  <RedisGroupOverview
    :prefix="prefix"
    :key-count="props.tabInfo?.metadata?.keyCount"
    :memory-usage="props.tabInfo?.metadata?.memoryUsage"
    :items="items"
    :loading="loading"
  />
</template>
