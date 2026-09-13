<script setup lang="ts">
import { computed } from 'vue';
import RedisDBSelector from '~/components/modules/selectors/RedisDBSelector.vue';
import type { RedisDatabaseOption } from '~/core/types/redis-workspace.types';
import type { RawQueryHeaderContext } from '../registry/rawQueryProfile.types';

const props = defineProps<{
  context?: RawQueryHeaderContext;
  redisDatabases?: RedisDatabaseOption[];
  redisDatabaseIndex?: number;
}>();

const emit = defineEmits<{
  (e: 'update:redisDatabaseIndex', databaseIndex: number): void;
}>();

const databases = computed(
  () => props.context?.redisDatabases ?? props.redisDatabases ?? []
);
const databaseIndex = computed(
  () => props.context?.redisDatabaseIndex ?? props.redisDatabaseIndex ?? 0
);

const handleUpdateDatabaseIndex = (index: number) => {
  if (props.context?.onUpdateRedisDatabaseIndex) {
    props.context.onUpdateRedisDatabaseIndex(index);
  }
  emit('update:redisDatabaseIndex', index);
};
</script>

<template>
  <RedisDBSelector
    compact
    trigger-id="raw-query-redis-db-index"
    trigger-class="bg-background"
    :databases="databases"
    :database-index="databaseIndex"
    @update:database-index="handleUpdateDatabaseIndex"
  />
</template>
