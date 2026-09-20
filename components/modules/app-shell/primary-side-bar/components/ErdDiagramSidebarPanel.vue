<script setup lang="ts">
import type { Component } from 'vue';
import { ErdDiagramPanel } from '#components';
import { DatabaseClientType } from '~/core/constants/database-client-type';

const props = defineProps<{
  dbType?: DatabaseClientType;
}>();

const current = computed<Component | null>(() => {
  switch (props.dbType) {
    case DatabaseClientType.MONGODB:
    case DatabaseClientType.REDIS:
      return null;
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
      return ErdDiagramPanel;
  }
});
</script>

<template>
  <KeepAlive>
    <component :is="current" v-if="current" />
  </KeepAlive>
</template>
