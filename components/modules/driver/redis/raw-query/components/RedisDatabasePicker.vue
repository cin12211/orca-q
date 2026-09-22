<script setup lang="ts">
import RedisDBSelector from '~/components/modules/selectors/RedisDBSelector.vue';
import type { RedisDatabaseOption } from '~/core/types/redis-workspace.types';

defineProps<{
  databases: RedisDatabaseOption[];
  databaseIndex: number;
}>();

defineEmits<{
  (e: 'update:databaseIndex', databaseIndex: number): void;
}>();
</script>
<template>
  <RedisDBSelector
    compact
    trigger-id="raw-query-redis-db-index"
    trigger-class="bg-background"
    :databases="databases"
    :database-index="databaseIndex"
    @update:database-index="$emit('update:databaseIndex', $event)"
  />
</template>
