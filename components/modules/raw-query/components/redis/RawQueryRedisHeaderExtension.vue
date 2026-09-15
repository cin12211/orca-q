<script setup lang="ts">
import { computed } from 'vue';
import { useRedisWorkspace } from '~/components/modules/redis-workspace/hooks/useRedisWorkspace';
import RedisDBSelector from '~/components/modules/selectors/RedisDBSelector.vue';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { RawQueryContext } from '../../registry/rawQueryProfile.types';

const props = defineProps<{
  context: RawQueryContext;
}>();

const isRedisConnection = computed(
  () => props.context.connection?.type === DatabaseClientType.REDIS
);

const redisConnection = computed(() =>
  isRedisConnection.value ? props.context.connection : undefined
);

const redisWorkspace = useRedisWorkspace({
  connection: redisConnection,
  mode: 'meta',
});

const databases = computed(() => redisWorkspace.databases.value ?? []);

const handleUpdateDatabaseIndex = (index: number) => {
  redisWorkspace.selectedDatabaseIndex.value = index;
};
</script>

<template>
  <RedisDBSelector
    compact
    trigger-id="raw-query-redis-db-index"
    trigger-class="bg-background"
    :databases="databases"
    :database-index="redisWorkspace.selectedDatabaseIndex.value"
    @update:database-index="handleUpdateDatabaseIndex"
  />
</template>
