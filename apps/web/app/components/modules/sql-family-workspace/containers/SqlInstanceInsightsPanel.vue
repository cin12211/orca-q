<script setup lang="ts">
import { DatabaseClientType } from '#shared/constants/database-client-type';
import type { Connection } from '~/core/stores';
import {
  GenericSqlInstanceInsightsPanel,
  PostgresInstanceInsightsPanel,
} from '../instance-insights';

defineProps<{
  connection: Connection;
}>();
</script>

<template>
  <PostgresInstanceInsightsPanel
    v-if="connection.type === DatabaseClientType.POSTGRES"
    :connection="connection"
  />
  <GenericSqlInstanceInsightsPanel v-else :connection="connection" />
</template>
