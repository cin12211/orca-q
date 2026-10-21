<script setup lang="ts">
import { BaseSqlRawQuery } from '~/components/modules/driver/shared/sql/raw-query';
import { SQLITE_RAW_QUERY_DESCRIPTOR } from '../descriptors';
</script>

<template>
  <BaseSqlRawQuery :descriptor="SQLITE_RAW_QUERY_DESCRIPTOR" />
</template>
