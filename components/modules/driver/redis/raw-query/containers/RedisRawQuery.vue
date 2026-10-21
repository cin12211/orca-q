<script setup lang="ts">
import { resolveCommandResultHandler } from '~/components/modules/driver/shared/raw-query';
import { RawQueryShell } from '~/components/modules/raw-query/shell';
import { RedisDatabasePicker } from '../components';
import { REDIS_RAW_QUERY_DESCRIPTOR } from '../descriptors';
import { useRedisRawQuery } from '../hooks';

const redis = useRedisRawQuery();
</script>

<template>
  <RawQueryShell
    :descriptor="REDIS_RAW_QUERY_DESCRIPTOR"
    :executor="redis.executor"
    :resolve-command-result-handler="resolveCommandResultHandler"
  >
    <template #header-extra>
      <RedisDatabasePicker
        :databases="redis.databases.value"
        :database-index="redis.selectedDatabaseIndex.value"
        @update:database-index="redis.setDatabaseIndex"
      />
    </template>
  </RawQueryShell>
</template>
