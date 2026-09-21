<script setup lang="ts">
import type { Component } from 'vue';
import { ExplorerPanel } from '#components';
import { DatabaseClientType } from '~/core/constants/database-client-type';

const props = defineProps<{
  dbType?: DatabaseClientType;
}>();

const current = computed<Component | null>(() => {
  switch (props.dbType) {
    case DatabaseClientType.MONGODB:
      return null;
    case DatabaseClientType.REDIS:
      return ExplorerPanel;
    case DatabaseClientType.POSTGRES:
    case DatabaseClientType.MYSQL:
    case DatabaseClientType.MYSQL2:
    case DatabaseClientType.MARIADB:
    case DatabaseClientType.SQLITE3:
    case DatabaseClientType.BETTER_SQLITE3:
    case DatabaseClientType.MSSQL:
    case DatabaseClientType.ORACLE:
    case DatabaseClientType.SNOWFLAKE:
    default:
      return ExplorerPanel;
  }
});
</script>

<template>
  <KeepAlive>
    <component :is="current" v-if="current" />
  </KeepAlive>
</template>
